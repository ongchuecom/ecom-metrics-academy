"""Đồng bộ thư mục Google Drive (tùy chọn): cần file khóa Service Account có quyền đọc thư mục đó.
Mỗi file Drive là một nguồn `drive:<fileId>`; file bị xóa khỏi thư mục thì tri thức của nó cũng bị xóa."""
import io
import os


def drive_docs(folder_id: str, creds_file: str) -> list:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
    from .ingest import extract_file_text
    creds = service_account.Credentials.from_service_account_file(creds_file, scopes=["https://www.googleapis.com/auth/drive.readonly"])
    svc = build("drive", "v3", credentials=creds, cache_discovery=False)

    def walk(fid, cat):
        token = None
        while True:
            resp = svc.files().list(q=f"'{fid}' in parents and trashed = false", fields="nextPageToken, files(id,name,mimeType)",
                                    pageSize=100, pageToken=token, supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
            for f in resp.get("files", []):
                if f["mimeType"] == "application/vnd.google-apps.folder":
                    yield from walk(f["id"], f"{cat}/{f['name']}" if cat else f["name"])
                else:
                    yield {**f, "category": cat or "drive"}
            token = resp.get("nextPageToken")
            if not token:
                break

    out = []
    for f in walk(folder_id, ""):
        try:
            mt = f["mimeType"]
            if mt in ("application/vnd.google-apps.document", "application/vnd.google-apps.presentation"):
                text = svc.files().export(fileId=f["id"], mimeType="text/plain").execute().decode("utf-8", "ignore")
            elif mt == "application/vnd.google-apps.spreadsheet":
                text = svc.files().export(fileId=f["id"], mimeType="text/csv").execute().decode("utf-8", "ignore")
            else:
                ext = os.path.splitext(f["name"])[1].lower()
                if ext not in (".pdf", ".docx", ".txt", ".md", ".csv", ".json"):
                    continue
                buf, req = io.BytesIO(), svc.files().get_media(fileId=f["id"])
                dl, done = MediaIoBaseDownload(buf, req), False
                while not done:
                    _, done = dl.next_chunk()
                text = extract_file_text(f["name"], buf.getvalue())
            if len(text.strip()) >= 50:
                out.append({"id": f["id"], "name": f["name"], "doc": {"source_type": "document", "ref_id": None, "title": f"{f['category']}/{f['name']}", "text": text}})
        except Exception as e:  # file lỗi thì bỏ qua, ghi vào kết quả
            out.append({"id": f["id"], "name": f["name"], "error": str(e)[:120]})
    return out

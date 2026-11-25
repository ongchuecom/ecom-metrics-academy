# Chuẩn hóa lời đọc tiếng Việt cho máy đọc: đơn vị tiền, phép tính, chữ viết tắt.
# Sửa file này (thêm cách đọc một từ…) thì tăng site.json → voice.version để đọc lại toàn bộ.
import re
DIGIT = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
WORDS = {  # cách người làm Ecom Việt hay đọc
    'ROAS': 'rô át', 'TACoS': 'ta cốt', 'Ads': 'át', 'ads': 'át', 'Net Sales': 'nét seo', 'Net margin': 'nét ma gin',
    'AOV': 'ây ô vi', 'CPA': 'xê pê a', 'CPM': 'xê pê em', 'CPC': 'xê pê xê', 'CPL': 'xê pê eo', 'CTR': 'xê tê e rờ',
    'CVR': 'xê vê e rờ', 'CR': 'xê e rờ', 'KOC': 'kốc', 'Koc': 'kốc', 'KOL': 'kôn', 'KPI': 'kây pi ai', 'P&L': 'pi en eo',
    'SKU': 'ét kây iu', 'COD': 'xê ô đê', 'GMV': 'gờ em vê', 'LTV': 'eo tê vê', 'CLV': 'xê eo vê', 'CAC': 'cát',
    'RTO': 'a tê ô', 'VAT': 'vát', 'TNDN': 'thu nhập doanh nghiệp', 'TNCN': 'thu nhập cá nhân', 'SOP': 'sốp',
    'SLA': 'ét eo a', 'CRM': 'xê a em', 'AI': 'ây ai', 'R&D': 'a en đi', 'MVP': 'em vê pê', 'GPM': 'gờ pê em',
    'DIO': 'đê i ô', 'DSO': 'đê ét ô', 'DPO': 'đê pê ô', 'CCC': 'xê xê xê', 'GMROI': 'gờ em roi', 'TikTok': 'tích tốc',
    'Shopee': 'sóp pi', 'Lazada': 'la da đa', 'Facebook': 'phây búc', 'Zalo': 'da lô', 'livestream': 'lai trim', 'Live': 'lai',
    'telesale': 'teo seo', 'Telesale': 'teo seo', 'voucher': 'vao chơ', 'Voucher': 'vao chơ', 'ship': 'síp', 'Freeship': 'phri síp',
    'Hero SKU': 'hia rô ét kây iu', 'Hook rate': 'húc rết', 'Dead Stock': 'đét sờ tóc', 'Cash Runway': 'kát răn uây',
}
LET = dict(zip('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'a bê xê đê e ép gờ hát i gi ca eo em en ô pê quy rờ ét tê u vê vê-kép ích i-dài dét'.split()))
def num_words(d): return ' '.join(DIGIT[int(c)] for c in d)
def normalize(t: str) -> str:
    t = re.sub(r'\*\*', '', t)
    t = re.sub(r'(\d)\s*k\b', r'\1 nghìn', t)
    t = re.sub(r'(\d)\s*tr\b', r'\1 triệu', t)
    t = re.sub(r'(\d)\s*tỉ\b', r'\1 tỷ', t)
    t = re.sub(r'(\d)\s*đ\b', r'\1 đồng', t)
    t = re.sub(r'(\d)\s*h\b', r'\1 giờ', t)
    t = re.sub(r'\s*/\s*(tháng|ngày|năm|đơn|người|giờ|tuần|sp|sản phẩm|khách|lượt|cái)\b', r' mỗi \1', t)
    t = re.sub(r'(?<=\w)\s*/\s*(?=\w)', ', ', t)  # "rủi ro/ bồi hoàn" → "rủi ro, bồi hoàn"
    t = t.replace('×', ' nhân ').replace('÷', ' chia ').replace(' − ', ' trừ ').replace(' - ', ' trừ ').replace(' + ', ' cộng ').replace(' = ', ' bằng ')
    t = t.replace('→', ' thành ').replace('↑', ' tăng').replace('↓', ' giảm').replace('≈', ' khoảng ').replace('~', 'khoảng ')
    t = re.sub(r'(\d)\s*–\s*(\d)', r'\1 đến \2', t)
    t = re.sub(r'\bCM\s?([0-9])\b', lambda m: 'xê em ' + DIGIT[int(m.group(1))], t)
    t = re.sub(r'(xê em (?:một|hai|ba|bốn))\s+(\d)', r'\1, \2', t)  # CM1 60% không bị đọc dính thành "một trăm sáu mươi"
    for k in sorted(WORDS, key=len, reverse=True):
        t = re.sub(r'(?<![\w])' + re.escape(k) + r'(?![\w])', WORDS[k], t)
    t = re.sub(r'\b([A-Z]{2,5})\b', lambda m: ' '.join(LET[c] for c in m.group(1)), t)  # viết tắt lạ: đánh vần
    t = re.sub(r',\s*([.,!?])', r'\1', t)
    return re.sub(r'\s+', ' ', t).strip()
if __name__ == '__main__':
    import sys
    for s in sys.argv[1:]: print(normalize(s))

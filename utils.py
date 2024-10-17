import re
import unicodedata
import logging

def normalize_unicode(text):
    return unicodedata.normalize('NFKC', text)

def standardize_university_name(name):
    original_name = name
    name = normalize_unicode(name)
    
    # 检查是否包含中文字符
    if any('\u4e00' <= char <= '\u9fff' for char in name):
        # 中文处理：只保留中文字符
        name = ''.join(char for char in name if '\u4e00' <= char <= '\u9fff')
    else:
        # 英文处理：只保留字母，并去掉所有空格
        name = re.sub(r'[^a-zA-Z]', '', name)
    
    result = name.lower()
    logging.debug(f"Standardizing: '{original_name}' -> '{result}'")
    return result

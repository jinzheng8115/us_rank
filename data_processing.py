import pandas as pd
import logging
from utils import standardize_university_name
from fuzzywuzzy import fuzz
from config import FUZZY_MATCH_THRESHOLD
import json

def load_data():
    try:
        us_100_df = pd.read_csv('US_100.csv', encoding='utf-8')
        subjects_df = pd.read_csv('Subjects.csv', encoding='utf-8')
        
        us_100_df['标准化中文名称'] = us_100_df['大学名称'].apply(standardize_university_name)
        us_100_df['标准化英文名称'] = us_100_df['University Name'].apply(standardize_university_name)
        
        subjects_df['标准化中文名称'] = subjects_df['大学名称（中文）'].apply(standardize_university_name)
        subjects_df['标准化英文名称'] = subjects_df['大学名称（英文）'].apply(standardize_university_name)
        
        university_subject_counts_cn = subjects_df.groupby('标准化中文名称')['学科'].nunique()
        university_subject_counts_en = subjects_df.groupby('标准化英文名称')['学科'].nunique()
        
        logging.info(f"Loaded CSV files: US_100.csv ({len(us_100_df)} rows), Subjects.csv ({len(subjects_df)} rows)")
        return us_100_df, subjects_df, university_subject_counts_en, university_subject_counts_cn
    except Exception as e:
        logging.error(f"Error loading CSV files: {str(e)}")
        return pd.DataFrame(), pd.DataFrame(), pd.Series(), pd.Series()

def find_best_match(target_name, df):
    standardized_target = standardize_university_name(target_name)
    
    # 精确匹配
    exact_match = df[(df['标准化中文名称'] == standardized_target) | (df['标准化英文名称'] == standardized_target)]
    if not exact_match.empty:
        return exact_match['大学名称（英文）'].iloc[0]
    
    # 模糊匹配
    best_match = None
    best_score = 0
    for _, row in df.iterrows():
        score = max(fuzz.ratio(standardized_target, row['标准化中文名称']),
                    fuzz.ratio(standardized_target, row['标准化英文名称']))
        if score > best_score:
            best_score = score
            best_match = row['大学名称（英文）']
    
    if best_score > FUZZY_MATCH_THRESHOLD:
        logging.info(f"Fuzzy match found for '{target_name}': {best_match} (score: {best_score})")
        return best_match
    
    logging.info(f"No match found for '{target_name}'")
    return None

def process_university_subjects(best_match, subjects_df, university_subject_counts_en, university_subject_counts_cn):
    standardized_name = standardize_university_name(best_match)
    matching_records = subjects_df[(subjects_df['标准化中文名称'] == standardized_name) | 
                                   (subjects_df['标准化英文名称'] == standardized_name)]
    
    if matching_records.empty:
        logging.warning(f"No records found for university: {best_match}")
        return []
    
    chinese_name = matching_records['大学名称（中文）'].iloc[0]
    english_name = matching_records['大学名称（英文）'].iloc[0]
    
    grouped_data = {}
    for _, record in matching_records.iterrows():
        subject = record['学科']
        if subject not in grouped_data:
            grouped_data[subject] = {'综合排名': record.get('综合排名', 'N/A'), '专业': []}
        
        if record['专业'] != '-' and record['专业'] is not None and pd.notna(record['专业']):
            专业排名 = record.get('专业排名', 'N/A')
            if pd.isna(专业排名):
                专业排名 = 'N/A'
            grouped_data[subject]['专业'].append({
                '专业名称': record['专业'],
                '专业排名': 专业排名
            })
    
    sorted_data = sorted(grouped_data.items(), key=lambda x: (
        int(x[1]['综合排名']) if x[1]['综合排名'] != 'N/A' and x[1]['综合排名'] != '-' else float('inf')
    ))
    
    logging.info(f"Processed {len(sorted_data)} subjects for {english_name} ({chinese_name})")
    return sorted_data

def find_us_news_ranking(target_name, us_100_df):
    standardized_target = standardize_university_name(target_name)
    
    # 精确匹配
    exact_match = us_100_df[(us_100_df['标准化中文名称'] == standardized_target) | 
                            (us_100_df['标准化英文名称'] == standardized_target)]
    if not exact_match.empty:
        return exact_match['US Rank'].iloc[0]
    
    # 模糊匹配
    CN_FUZZY_MATCH_THRESHOLD = 90
    EN_FUZZY_MATCH_THRESHOLD = 88
    
    best_match = None
    best_score = 0
    for _, row in us_100_df.iterrows():
        cn_score = fuzz.ratio(standardized_target, row['标准化中文名称'])
        en_score = fuzz.ratio(standardized_target, row['标准化英文名称'])
        
        if (cn_score > best_score and cn_score > CN_FUZZY_MATCH_THRESHOLD) or \
           (en_score > best_score and en_score > EN_FUZZY_MATCH_THRESHOLD):
            best_score = max(cn_score, en_score)
            best_match = row['US Rank']
    
    if best_match:
        logging.info(f"Fuzzy match found for '{target_name}': US Rank {best_match} (score: {best_score})")
        return best_match
    
    return "大于100"

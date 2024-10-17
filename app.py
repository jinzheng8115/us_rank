from flask import Flask, jsonify, send_from_directory, request
import logging
import pandas as pd
import numpy as np
from data_processing import load_data, find_best_match, process_university_subjects, find_us_news_ranking

app = Flask(__name__, static_folder='.', static_url_path='')

# 设置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='app.log',  # 日志文件名
    filemode='w'  # 'w' 模式会在每次运行时覆盖日志文件，如果想要追加日志，可以改为 'a'
)

# 同时将日志输出到控制台
console = logging.StreamHandler()
console.setLevel(logging.INFO)
formatter = logging.Formatter('%(name)-12s: %(levelname)-8s %(message)s')
console.setFormatter(formatter)
logging.getLogger('').addHandler(console)

us_100_df, subjects_df, university_subject_counts_en, university_subject_counts_cn = load_data()

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/overall-ranking')
def overall_ranking():
    data = us_100_df.to_dict('records')
    for record in data:
        for key, value in record.items():
            if pd.isna(value):
                record[key] = None
        if 'School Website' not in record or not record['School Website']:
            record['School Website'] = record.get(' School Website') or 'N/A'
    logging.info(f"Returning {len(data)} records for overall ranking.")
    return jsonify(data)

@app.route('/api/university-subjects/<university_name>')
def university_subjects(university_name):
    best_match = find_best_match(university_name, subjects_df)
    if best_match is None:
        logging.warning(f"No match found for university: {university_name}")
        return jsonify({"error": "University not found or no subject data available"}), 404
    
    sorted_data = process_university_subjects(best_match, subjects_df, university_subject_counts_en, university_subject_counts_cn)
    if not sorted_data:
        logging.warning(f"No subject data found for university: {university_name}")
        return jsonify({"error": "No subject data available for this university"}), 404
    return jsonify(sorted_data)

@app.route('/api/subjects-and-specialties')
def subjects_and_specialties():
    subjects_df = pd.read_csv('Subjects.csv', encoding='utf-8')
    subjects_dict = {}
    
    for _, row in subjects_df.iterrows():
        subject = row['学科']
        specialty = row['专业']
        
        if subject not in subjects_dict:
            subjects_dict[subject] = set()
        
        if pd.notna(specialty) and specialty != '-':
            subjects_dict[subject].add(specialty)
    
    # 将集合转换为列表
    for subject in subjects_dict:
        subjects_dict[subject] = list(subjects_dict[subject])
    
    return jsonify(subjects_dict)

@app.route('/api/search-subjects', methods=['POST'])
def search_subjects():
    try:
        search_params = request.json
        subjects_df = pd.read_csv('Subjects.csv', encoding='utf-8')
        
        filtered_df = subjects_df[subjects_df['学科'] == search_params['subject']]
        
        if search_params.get('specialty'):
            # 如果选择了专业，只返回该专业的排名
            filtered_df = filtered_df[filtered_df['专业'] == search_params['specialty']]
        else:
            # 如果只选择了学科，返回该学科所有专业的排名，包括综合排名（专业为"-"的记录）
            filtered_df = filtered_df

        results = []
        for _, row in filtered_df.iterrows():
            result = {
                '大学名称': row['大学名称（中文）'],
                'University Name': row['大学名称（英文）'],
                'subject': row['学科'],
                'specialty': row['专业'] if pd.notna(row['专业']) and row['专业'] != '-' else None,
                'overall_ranking': row['综合排名'],
                'subject_ranking': row['专业排名']
            }
            
            # 确保所有值都是 JSON 可序列化的
            for key, value in result.items():
                if pd.isna(value):
                    result[key] = None
                elif isinstance(value, np.int64):
                    result[key] = int(value)
                elif isinstance(value, np.float64):
                    result[key] = float(value)
            
            results.append(result)
        
        # 不需要额外的排序，因为数据已经按照排名顺序排列
        
        logging.info(f"Subject search returned {len(results)} results")
        return jsonify(results)
    except Exception as e:
        logging.error(f"Error in search_subjects: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search():
    search_params = request.json
    filtered_df = us_100_df.copy()
    
    logging.info(f"Received search parameters: {search_params}")
    logging.info(f"Initial dataframe size: {len(filtered_df)}")

    if search_params.get('name'):
        name_filter = filtered_df['University Name'].str.contains(search_params['name'], case=False) | \
                      filtered_df['大学名称'].str.contains(search_params['name'], case=False)
        filtered_df = filtered_df[name_filter]
        logging.info(f"After name filter: {len(filtered_df)} results")

    if search_params.get('rankFrom'):
        filtered_df = filtered_df[filtered_df['US Rank'].str.replace('#', '').astype(int) >= int(search_params['rankFrom'])]
        logging.info(f"After rankFrom filter: {len(filtered_df)} results")
    if search_params.get('rankTo'):
        filtered_df = filtered_df[filtered_df['US Rank'].str.replace('#', '').astype(int) <= int(search_params['rankTo'])]
        logging.info(f"After rankTo filter: {len(filtered_df)} results")

    if search_params.get('acceptanceRateFrom'):
        filtered_df = filtered_df[filtered_df['Acceptance Rate'].str.rstrip('%').astype(float) >= float(search_params['acceptanceRateFrom'])]
        logging.info(f"After acceptanceRateFrom filter: {len(filtered_df)} results")
    if search_params.get('acceptanceRateTo'):
        filtered_df = filtered_df[filtered_df['Acceptance Rate'].str.rstrip('%').astype(float) <= float(search_params['acceptanceRateTo'])]
        logging.info(f"After acceptanceRateTo filter: {len(filtered_df)} results")

    if search_params.get('tuitionFrom'):
        filtered_df = filtered_df[filtered_df['Tuition & Fees'].str.replace('$', '').str.replace(',', '').astype(float) >= float(search_params['tuitionFrom'])]
        logging.info(f"After tuitionFrom filter: {len(filtered_df)} results")
    if search_params.get('tuitionTo'):
        filtered_df = filtered_df[filtered_df['Tuition & Fees'].str.replace('$', '').str.replace(',', '').astype(float) <= float(search_params['tuitionTo'])]
        logging.info(f"After tuitionTo filter: {len(filtered_df)} results")

    # 通用范围搜索函数
    def range_search(column, from_param):
        def parse_range(range_str):
            if pd.isna(range_str) or range_str == 'N/A':
                return None, None
            parts = str(range_str).split('-')
            if len(parts) != 2:
                return None, None
            try:
                return float(parts[0]), float(parts[1])
            except ValueError:
                return None, None

        filtered_df[f'{column} Low'], filtered_df[f'{column} High'] = zip(*filtered_df[f'{column} Range*'].apply(parse_range))
        
        if from_param in search_params:
            from_value = float(search_params[from_param])
            logging.info(f"Searching {column} with from={from_value}")
            return filtered_df[
                (filtered_df[f'{column} Low'].notnull() & (filtered_df[f'{column} Low'] <= from_value)) |
                (filtered_df[f'{column} Range*'].isin(['N/A', np.nan]))
            ]
        
        logging.info(f"No {column} filter applied")
        return filtered_df

    # SAT 分数搜索
    if 'satFrom' in search_params:
        filtered_df = range_search('SAT', 'satFrom')
        logging.info(f"After SAT filter: {len(filtered_df)} results")

    # ACT 分数搜索
    if 'actFrom' in search_params:
        filtered_df = range_search('ACT', 'actFrom')
        logging.info(f"After ACT filter: {len(filtered_df)} results")

    # GPA 搜索
    if 'gpaFrom' in search_params:
        filtered_df = range_search('High School GPA', 'gpaFrom')
        logging.info(f"After GPA filter: {len(filtered_df)} results")

    result = filtered_df.to_dict('records')
    
    # 将 NaN 值转换为 None (null in JSON)
    for record in result:
        for key, value in record.items():
            if pd.isna(value):
                record[key] = None
            elif isinstance(value, np.int64):
                record[key] = int(value)
            elif isinstance(value, np.float64):
                record[key] = float(value)

    logging.info(f"Search returned {len(result)} results")
    return jsonify(result)

@app.route('/api/search-us-news-ranking', methods=['POST'])
def search_us_news_ranking():
    try:
        search_params = request.json
        university_name = search_params.get('university_name')
        
        if not university_name:
            return jsonify({"error": "University name is required"}), 400

        ranking = find_us_news_ranking(university_name, us_100_df)
        return jsonify({"ranking": ranking})
    
    except Exception as e:
        logging.error(f"Error in search_us_news_ranking: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)

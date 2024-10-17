// 获取综合排名数据
async function fetchOverallRanking() {
    const response = await fetch('/api/overall-ranking');
    return await response.json();
}

// 获取特定大学的学科专业排名数据
async function fetchUniversitySubjects(universityName) {
    const response = await fetch(`/api/university-subjects/${encodeURIComponent(universityName)}`);
    return await response.json();
}

// 全局变量存储所有大学数据
let allUniversities = [];

// 填充大学列表
async function populateUniversityList() {
    const data = await fetchOverallRanking();
    allUniversities = data;  // 保存所有大学数据
    renderUniversityList(data);
}

// 渲染大学列表
function renderUniversityList(universities) {
    const universityRows = document.getElementById("universityRows");
    universityRows.innerHTML = "";  // 清空现有内容
    if (universities.length === 0) {
        universityRows.innerHTML = "<p>没有找到匹配的大学。</p>";
        return;
    }
    universities.forEach((uni) => {
        const row = document.createElement("div");
        row.className = "university-row";
        row.innerHTML = `
            <span class="rank-column">${uni['US Rank'] || 'N/A'}</span>
            <span class="en-name-column">${uni['University Name'] || 'N/A'}</span>
            <span class="cn-name-column">${uni['大学名称'] || 'N/A'}</span>
        `;
        row.addEventListener('click', () => handleUniversityChange(uni['University Name']));
        universityRows.appendChild(row);
    });
}

// 处理搜索
async function handleSearch() {
    const searchParams = {
        name: document.getElementById("searchInput").value,
        rankFrom: document.getElementById("rankFrom").value,
        rankTo: document.getElementById("rankTo").value,
        acceptanceRateFrom: document.getElementById("acceptanceRateFrom").value,
        acceptanceRateTo: document.getElementById("acceptanceRateTo").value,
        tuitionFrom: document.getElementById("tuitionFrom").value,
        tuitionTo: document.getElementById("tuitionTo").value,
        satFrom: document.getElementById("satFrom").value,
        actFrom: document.getElementById("actFrom").value,
        gpaFrom: document.getElementById("gpaFrom").value
    };

    // 移除空字串或未定义的参数
    Object.keys(searchParams).forEach(key => 
        (searchParams[key] === '' || searchParams[key] === undefined) && delete searchParams[key]
    );

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(searchParams),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Search results:', data);
        renderUniversityList(data);
    } catch (error) {
        console.error('Error during search:', error);
    }
}

// 显示大学基本信息
function displayUniversityInfo(university) {
    const tbody = document.querySelector("#universityInfo tbody");
    tbody.innerHTML = ""; // 清空现有内容
    const fields = [
        ['US Rank', '美国大学综合排名'],
        ['University Name', ''],
        ['大学名称', '大学名称'],
        ['School Website', '大学网址'],
        ['Public/Private', '公立/私立'],
        ['Acceptance Rate', '录取率'], 
        ['SAT Range*', 'SAT分数范围'], 
        ['ACT Range*', 'ACT分数范围'], 
        ['High School GPA*', '高中平均绩点'],
        ['Tuition & Fees', '学费'],
        ['Food & Housing', '食宿费'],
        ['4-Year Graduation Rate', '4年毕业率'],
        ['Student/Faculty Ratio', '师生比'],
        ['Classes With Fewer Than 20 Students', '20人以下小比例'],
        ['Median Salary 6 Years After Graduation', '毕业6年后的中位数薪资']
    ];
    fields.forEach(([fieldEn, fieldCn]) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = fieldCn ? `${fieldEn} (${fieldCn})` : fieldEn;
        let value = university[fieldEn];
        if (fieldEn === 'School Website') {
            if (!value || value === 'N/A') {
                value = university[' School Website'] || 'N/A'; // 注意空格
            }
            if (value !== 'N/A') {
                // 创建一个链接元素
                const link = document.createElement('a');
                link.href = value.startsWith('http') ? value : `https://${value}`;
                link.textContent = value;
                link.target = '_blank'; // 在新标签页中打开链接
                row.insertCell().appendChild(link);
            } else {
                row.insertCell().textContent = 'N/A';
            }
        } else {
            row.insertCell().textContent = value || 'N/A';
        }
    });
}

// 显示大学的学科专业排名
async function displaySubjectRanking(universityName) {
    const tbody = document.querySelector("#subjectRanking tbody");
    tbody.innerHTML = ""; // 清空现有内容
    const data = await fetchUniversitySubjects(universityName);
    data.forEach(([subject, subjectData]) => {
        const subjectRow = tbody.insertRow();
        subjectRow.classList.add('subject-row');
        subjectRow.insertCell().textContent = subject;
        subjectRow.insertCell().textContent = subjectData['综合排名'] || 'N/A';
        
        if (subjectData['专业'].length === 0) {
            subjectRow.insertCell().textContent = '-';
            subjectRow.insertCell().textContent = '-';
        } else {
            subjectData['专业'].forEach((specialty, index) => {
                if (index === 0) {
                    subjectRow.insertCell().textContent = specialty['专业名称'];
                    subjectRow.insertCell().textContent = specialty['专业排名'] || 'N/A';
                } else {
                    const specialtyRow = tbody.insertRow();
                    specialtyRow.insertCell();
                    specialtyRow.insertCell();
                    specialtyRow.insertCell().textContent = specialty['专业名称'];
                    specialtyRow.insertCell().textContent = specialty['专业排名'] || 'N/A';
                }
            });
        }
    });
}

// 处理大学选择变化
async function handleUniversityChange(selectedUniversityName) {
    const university = allUniversities.find(uni => uni['University Name'] === selectedUniversityName);
    if (university) {
        displayUniversityInfo(university);
        await displaySubjectRanking(selectedUniversityName);
    }
}

// 重置搜索条件
function resetSearch() {
    document.getElementById("searchInput").value = "";
    document.getElementById("rankFrom").value = "";
    document.getElementById("rankTo").value = "";
    document.getElementById("acceptanceRateFrom").value = "";
    document.getElementById("acceptanceRateTo").value = "";
    document.getElementById("tuitionFrom").value = "";
    document.getElementById("tuitionTo").value = "";
    document.getElementById("satFrom").value = "";
    document.getElementById("actFrom").value = "";
    document.getElementById("gpaFrom").value = "";

    // 重新加载所有大学数据
    renderUniversityList(allUniversities);
}

// 初始化页面
async function init() {
    await populateUniversityList();
    
    // 获取排名第一的学校并显示其信息
    if (allUniversities.length > 0) {
        const topUniversity = allUniversities[0];
        displayUniversityInfo(topUniversity);
        await displaySubjectRanking(topUniversity['University Name']);
    }

    // ���加事件监听器
    document.getElementById("searchButton").addEventListener("click", handleSearch);
    document.getElementById("advancedSearchButton").addEventListener("click", handleSearch);
    document.getElementById("resetButton").addEventListener("click", resetSearch);
    document.getElementById("advancedResetButton").addEventListener("click", resetSearch);
    
    const searchInputs = [
        "searchInput", "rankFrom", "rankTo", "acceptanceRateFrom", "acceptanceRateTo",
        "tuitionFrom", "tuitionTo", "satFrom", "actFrom", "gpaFrom"
    ];
    
    searchInputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.addEventListener("keyup", (event) => {
                if (event.key === "Enter") {
                    handleSearch();
                }
            });
        }
    });

    await populateSubjectSelect();
}

// 当页面加载完成时运行初始化函数
window.addEventListener("load", init);

// 获取模态框元素
var modal = document.getElementById("subjectSearchModal");

// 获取打开模态框的链接
var link = document.getElementById("openSubjectSearchLink");

// 获取 <span> 元素，用于关闭模态框
var span = document.getElementsByClassName("close")[0];

// 当用户点击链接时，打开模态框 
link.onclick = function() {
    modal.style.display = "block";
}

// 当用户点击 <span> (x)时，关闭模态框
span.onclick = function() {
    modal.style.display = "none";
}

// 在用户点击模态框外部时关闭它
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// 处理学科和专业搜索
document.getElementById("subjectSearchButton").addEventListener("click", handleSubjectSearch);

// 获取学科和专业数据
async function fetchSubjectsAndSpecialties() {
    const response = await fetch('/api/subjects-and-specialties');
    return await response.json();
}

// 填充学科下拉框
async function populateSubjectSelect() {
    const subjectSelect = document.getElementById("subjectSelect");
    const data = await fetchSubjectsAndSpecialties();
    
    Object.keys(data).forEach(subject => {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
    });
}

// 处理学科选择变化
document.getElementById("subjectSelect").addEventListener("change", async function() {
    const specialtySelect = document.getElementById("specialtySelect");
    specialtySelect.innerHTML = '<option value="">请选择专业</option>';
    
    if (this.value) {
        const data = await fetchSubjectsAndSpecialties();
        const specialties = data[this.value];
        
        specialties.forEach(specialty => {
            const option = document.createElement("option");
            option.value = specialty;
            option.textContent = specialty;
            specialtySelect.appendChild(option);
        });
        
        specialtySelect.disabled = false;
    } else {
        specialtySelect.disabled = true;
    }
});

// 修改 handleSubjectSearch 函数
async function handleSubjectSearch() {
    const subjectName = document.getElementById("subjectSelect").value;
    const specialtyName = document.getElementById("specialtySelect").value;
    
    if (!subjectName) {
        alert("请选择一个学科");
        return;
    }

    try {
        const response = await fetch('/api/search-subjects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ subject: subjectName, specialty: specialtyName }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.length === 0) {
            alert("没有找到匹配的结果");
            return;
        }

        // 创建一个新的窗口来显示搜索结果
        const resultsWindow = window.open('', '_blank');
        resultsWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>学科和专业搜索结果</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f4f4f4;
                    }
                    h1, h2, h3 {
                        color: #2c3e50;
                    }
                    .specialty-section {
                        background-color: #fff;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        margin-bottom: 20px;
                        padding: 20px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    th, td {
                        padding: 12px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }
                    th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    tr:hover {
                        background-color: #f5f5f5;
                    }
                </style>
            </head>
            <body>
                <div id="app">
                    <h1>学科和专业搜索结果</h1>
                    <h2>${subjectName} ${specialtyName ? '- ' + specialtyName : ''}</h2>
                    <div id="searchResults"></div>
                </div>
                <script>
                    const universities = ${JSON.stringify(data)};
                    
                    ${fetchUSNewsRanking.toString()}
                    ${renderSubjectSearchResults.toString()}

                    // 立即调用异步函数来渲染结果
                    (async () => {
                        await renderSubjectSearchResults(universities);
                    })();
                </script>
            </body>
            </html>
        `);
        resultsWindow.document.close();
    } catch (error) {
        console.error('Error during subject search:', error);
        alert('搜索过程中发生错误：' + error.message);
    }
}

async function renderSubjectSearchResults(universities) {
    const searchResults = document.getElementById("searchResults");
    if (!searchResults) {
        console.error("searchResults element not found");
        return;
    }
    searchResults.innerHTML = "";

    if (!universities.length) {
        searchResults.innerHTML = "<p>没有找到匹配的结果。</p>";
        return;
    }

    // 按专业分组
    const groupedBySpecialty = universities.reduce((acc, uni) => {
        const specialty = uni.specialty || '综合';
        if (!acc[specialty]) {
            acc[specialty] = [];
        }
        acc[specialty].push(uni);
        return acc;
    }, {});

    for (const [specialty, unis] of Object.entries(groupedBySpecialty)) {
        const specialtyDiv = document.createElement('div');
        specialtyDiv.className = 'specialty-section';
        specialtyDiv.innerHTML = `<h3>${specialty}</h3>`;

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>排名</th>
                    <th>大学名称（中文）</th>
                    <th>大学名称（英文）</th>
                    <th>学科</th>
                    <th>学科综合排名</th>
                    <th>US News大学综合排名</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        for (const uni of unis) {
            const row = table.tBodies[0].insertRow();
            const usNewsRank = await fetchUSNewsRanking(uni['University Name']);
            row.innerHTML = `
                <td>${uni.subject_ranking || 'N/A'}</td>
                <td>${uni['大学名称'] || 'N/A'}</td>
                <td>${uni['University Name'] || 'N/A'}</td>
                <td>${uni.subject || 'N/A'}</td>
                <td>${uni.overall_ranking || 'N/A'}</td>
                <td>${usNewsRank}</td>
            `;
        }
        
        specialtyDiv.appendChild(table);
        searchResults.appendChild(specialtyDiv);
    }
}

async function fetchUSNewsRanking(universityName) {
    try {
        const response = await fetch('/api/search-us-news-ranking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ university_name: universityName }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.ranking || "大于100";
    } catch (error) {
        console.error('Error fetching US News ranking:', error);
        return "大于100";
    }
}

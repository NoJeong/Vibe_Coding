document.addEventListener('DOMContentLoaded', () => {

    // 마스터 데이터: 이 중에서 랜덤으로 품목을 선택합니다.
    const masterItemList = [
        { name: '프리미엄 키보드', price: 180000 },
        { name: '고성능 마우스', price: 85000 },
        { name: 'QHD 모니터', price: 450000 },
        { name: '웹캠', price: 120000 },
        { name: 'USB-C 허브', price: 65000 },
        { name: '노트북 거치대', price: 35000 },
        { name: 'AI 스피커', price: 150000 },
        { name: '스마트 전구', price: 25000 },
        { name: '기계식 키보드', price: 130000 },
        { name: '무선 충전기', price: 45000 },
    ];

    // 지정된 수만큼 랜덤 데이터를 생성하는 함수
    function generateRandomReportData(itemCount) {
        const items = [];
        for (let i = 0; i < itemCount; i++) {
            const randomMasterItem = masterItemList[Math.floor(Math.random() * masterItemList.length)];
            const randomQuantity = Math.floor(Math.random() * 5) + 1;
            
            items.push({
                name: randomMasterItem.name,
                quantity: randomQuantity,
                price: randomMasterItem.price
            });
        }
        return { items };
    }

    function generateReport(data) {
        const tableBody = document.querySelector("#report-table tbody");
        const summaryTotalEl = document.querySelector(".summary p");
        
        tableBody.innerHTML = '';

        let total = 0;

        data.items.forEach(item => {
            const row = document.createElement('tr');
            const itemTotal = item.quantity * item.price;
            total += itemTotal;

            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.quantity.toLocaleString()}</td>
                <td>${item.price.toLocaleString()}</td>
                <td>${itemTotal.toLocaleString()}</td>
            `;
            tableBody.appendChild(row);
        });

        summaryTotalEl.innerHTML = `<strong>총 합계:</strong> ${total.toLocaleString()} 원`;
    }

    // 20개의 랜덤 아이템으로 보고서 생성
    const reportData = generateRandomReportData(60);
    generateReport(reportData);
});
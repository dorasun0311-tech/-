const productCSV = "desc-product.csv"; 	//將desc-product.csv檔案對應給productCSV
let products = []; 						// 用來存放商品資料的陣列


init(); 			// 初始化，立即執行

async function init() { 	//以下指的是初始函式要執行的事件
    try {
        const productText = await loadCSV(productCSV);	//讀取商品 desc-product.csv對應給productText
        parseProducts(productText);	//呼叫函式-帶入值 (productText)
        renderProducts();			// 呼叫函式
    } catch (e) {
        console.error("初始化失敗:", e);
    }
}

// 1. 讀取 CSV
async function loadCSV(file) {		//載入檔案與"讀取"的函式
    // 如果是UTF-8 CSV可以直接讀取
	const res = await fetch(file);
    if (!res.ok) throw new Error(`無法讀取 ${file}`);
    return await res.text();		//res是response, 回傳物件
}

// 2. 解析商品 CSV
function parseProducts(data) {				//這個函式在做分切資料desc-product.csv檔
    const rows = data.trim().split("\n");	//以換行方式(\n)分切,trim可以移除開頭與結尾空白
    rows.shift(); 							// 移除第一個元素(就是移除標題列)

    products = rows.map(r => {				//逐列解析
        const c = r.split(",");				//依照逗號分切
        return {
            id: c[0].trim(),      			// 0是第1欄資料-商品編號
            name: c[1].trim(),			    // 1是第2欄資料-商品名稱
            img: c[2].trim(),     			// 2是第3欄資料-圖片檔名
            price: parseInt(c[3]) || 0,		// 3是第4欄資料-商品價格 (||或)
            desc: c[4] || "",				// 4是第5欄資料-商品描述，或給空字串
            entryID: c[5].trim()  			// 5是第6欄資料-Google Form entry.xxxx
        };
    });
}

// 3. 將csv資料套用到商品表格與隱藏欄位
function renderProducts() {				//這個函式是在做商品資料套入到html的tbody中
    const tbody = document.getElementById("productBody");
    const form = document.getElementById("orderForm");
    
    // 清空舊內容
    tbody.innerHTML = "";
    
    // 確保有一個專門放 Hidden Input 的容器(hiddenContainer)
    let hiddenContainer = document.getElementById("hiddenContainer");
    if (!hiddenContainer) {
        hiddenContainer = document.createElement("div");
        hiddenContainer.id = "hiddenContainer";
        form.appendChild(hiddenContainer);
    }
    hiddenContainer.innerHTML = ""; 

    products.forEach((p) => {			//將拆解的product內容個別套入,依序是圖,品名,價格,數量,小計
        // 生成表格行
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><img src="images/${p.img}" class="productImg" style="width:50px;"></td>
            <td>${p.name}</td>
            <td class="price">${p.price}</td>
            <td>
                <input type="number" min="0" value="0" 
                       class="qty" 
                       data-id="${p.id}" 
                       oninput="updateProductRow('${p.id}')">
            </td>
            <td class="subtotal" id="sub-${p.id}">0</td>
        `;
        tbody.appendChild(tr);

        // 生成對應的 Hidden Input (送往 Google Form)
        if (p.entryID) {
            const hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.name = p.entryID;			//name="entryID"
            hidden.id = "h-" + p.id;			//id="h-P001"
            hidden.value = 0;					//送出的數量-預設值
            hiddenContainer.appendChild(hidden);
        }
    });

    // 初始化總計欄位 (假設你的總計 entryID 叫 formTotal)
    // 如果總計也要送出，請確保 HTML 有 <input type="hidden" name="entry.總計ID" id="formTotal">
}

// 4. 當數量改變時：更新該列小計與隱藏欄位
function updateProductRow(productId) {						//小計函式
    const product = products.find(p => p.id === productId); //對每一個去檢查id是不是等於prductId
    const qtyInput = document.querySelector(`.qty[data-id="${productId}"]`);
    const qty = parseInt(qtyInput.value) || 0;

    // 更新畫面小計
    const subtotalCell = document.getElementById(`sub-${productId}`);
    	if (subtotalCell) subtotalCell.textContent = qty * product.price;	//小計的計算是數量乘上價格

    // 更新隱藏欄位
    const hidden = document.getElementById(`h-${productId}`);
    if (hidden) hidden.value = qty;

    // 更新總計
    updateTotal();
}

// 5. 更新總計
function updateTotal() {
    let total = 0;
    products.forEach(p => {
        const qtyInput = document.querySelector(`.qty[data-id="${p.id}"]`);
        const qty = qtyInput ? (parseInt(qtyInput.value) || 0) : 0;
        total += qty * p.price;		//每個小計相加存回total
    });

    // 更新畫面顯示
    const totalPriceEl = document.getElementById("totalPrice");
    if (totalPriceEl) totalPriceEl.textContent = total;

    // 更新總金額隱藏欄位 (送往 Google Form)
    const formTotal = document.getElementById("formTotal");
    if (formTotal) formTotal.value = total;		//更新d=formTotal 的value值
}

// 6. 送出監聽
const form = document.getElementById("orderForm");
const msgDiv = document.createElement("div");
msgDiv.id = "submitMsg";
msgDiv.style.display = "none";
form.parentNode.insertBefore(msgDiv, form.nextSibling);

form.addEventListener("submit", (e) => {
    // 這裡不呼叫 e.preventDefault()，讓表單正常送出到 Google Form
    
    // Debug: 檢查即將送出的資料 (可在控制台查看)
    const formData = new FormData(form);
    console.log("--- 送出清單 ---");
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }

    msgDiv.textContent = "訂單處理中...";
    msgDiv.style.display = "block";

    // 送出後重置 (延遲執行，避免影響送出程序)
    setTimeout(() => {
        form.reset();
        document.querySelectorAll(".subtotal").forEach(td => td.textContent = "0");
        document.getElementById("totalPrice").textContent = "0";
        // 重置所有隱藏值
        document.querySelectorAll("#hiddenContainer input").forEach(input => input.value = 0);
        msgDiv.style.display = "none";
    }, 1000);
});
function loadQ3Chart() {  
    d3.select("#chart").html("");
    d3.select("#legend").html("");
 
    d3.json("/visualize/").then(function(rawData) {
        var parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
 
        // Gom nhóm doanh số theo tháng
        let monthlySales = rawData.reduce((acc, d) => {
            let month = parseTime(d["Thời gian tạo đơn"]).getMonth() + 1;
            if (!acc[month]) acc[month] = { revenue: 0, quantity: 0 };
            acc[month].revenue += (+d["Thành tiền"]);
            acc[month].quantity += (+d["SL"]);
            return acc;
        }, {});
 
        // Chuyển đổi thành mảng { month, doanhSo, quantity }
        let dataset = Object.entries(monthlySales)
            .map(([month, values]) => ({ 
                month: +month, 
                doanhSo: values.revenue / 1e6, // Chuyển thành triệu VND
                quantity: values.quantity,
                monthLabel: `Tháng ${String(month).padStart(2, "0")}` 
            }))
            .sort((a, b) => a.month - b.month);
 
        createBarChart(dataset);
    }).catch(error => console.error("Lỗi khi đọc CSV:", error));
 }
 
 // Hàm vẽ biểu đồ cột
 function createBarChart(data) {
    var margin = { top: 70, right: 50, bottom: 80, left: 100 },  // 🔥 Chừa không gian cho tiêu đề
        width  = 1300 - margin.left - margin.right,
        height = 520 - margin.top - margin.bottom;
 
    var svg = d3.select("#chart").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);
 
    // 🟢 Thêm tiêu đề trực tiếp trong SVG
    svg.append("text")
       .attr("x", width / 2)
       .attr("y", -30) // Dịch lên trên để không bị trùng nội dung
       .attr("text-anchor", "middle")
       .style("font-size", "20px")
       .style("font-weight", "bold")
       .style("fill", "#00A896")
       .text("Doanh số bán hàng theo Tháng");
 
    var maxVal = d3.max(data, d => d.doanhSo);
    var y = d3.scaleLinear().domain([0, maxVal]).nice().range([height, 0]);
    var x = d3.scaleBand().domain(data.map(d => d.monthLabel)).range([0, width]).padding(0.2);
 
    // Sử dụng màu từ d3.schemeCategory10 cho từng tháng
    var color = d3.scaleOrdinal(d3.schemeCategory10).domain(data.map(d => d.month));
 
    // Tooltip
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "#fff")
        .style("padding", "6px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("visibility", "hidden");
 
    // Vẽ cột
    svg.selectAll(".bar")
       .data(data)
       .enter().append("rect")
       .attr("class", "bar")
       .attr("x", d => x(d.monthLabel))
       .attr("y", d => y(d.doanhSo))
       .attr("width", x.bandwidth())
       .attr("height", d => height - y(d.doanhSo))
       .attr("fill", d => color(d.month))
       .on("mouseover", function(event, d) {
           tooltip.style("visibility", "visible")
               .html(`
                   <strong>${d.monthLabel}</strong><br>
                   <strong>Doanh số bán:</strong> ${formatValue(d.doanhSo)} triệu VND<br>
                   <strong>Số lượng bán:</strong> ${d3.format(",")(d.quantity)} SKUs
               `);
       })
       .on("mousemove", function(event) {
           tooltip.style("top", `${event.pageY - 10}px`)
               .style("left", `${event.pageX + 10}px`);
       })
       .on("mouseout", function() {
           tooltip.style("visibility", "hidden");
       });
 
    // Nhãn giá trị trên đỉnh cột
    svg.selectAll(".bar-label")
       .data(data)
       .enter().append("text")
       .attr("class", "bar-label")
       .attr("x", d => x(d.monthLabel) + x.bandwidth() / 2)
       .attr("y", d => y(d.doanhSo) + 20)
       .attr("text-anchor", "middle")
       .style("fill", "white")
       .style("font-size", `11px`)
       .style("font-weight", "bold")
       .text(d => formatValue(d.doanhSo) + " triệu VND");
 
    // Trục X
    svg.append("g")
       .attr("class", "axis x-axis")
       .attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(x))
       .selectAll("text")
       .style("text-anchor", "end")
       .attr("dx", "-0.8em")
       .attr("dy", "0.15em")
       .attr("transform", "rotate(-45)"); // 👈 Nghiêng 45 độ cho dễ đọc
 
    // Trục Y
    svg.append("g")
       .attr("class", "axis y-axis")
       .call(d3.axisLeft(y).ticks(Math.ceil(maxVal / 200)).tickFormat(d => d + "M"));
 }
 
 // Format giá trị (1,000 triệu VND) với 1 số thập phân
 function formatValue(million) {
    return million.toFixed(0).replace(".", ",");
 }
 
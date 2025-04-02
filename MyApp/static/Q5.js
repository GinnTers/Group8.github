function loadQ5Chart() {   
    d3.select("#chart").html("");
    d3.select("#legend").html("");

    d3.json("/visualize/").then(function(rawData) {
        function getDayOfMonth(dateString) {
            const date = new Date(dateString);
            return `Ngày ${String(date.getDate()).padStart(2, "0")}`;
        }

        rawData.forEach(d => {
            d["Ngày trong tháng"] = getDayOfMonth(d["Thời gian tạo đơn"]);
        });

        let salesByDay = Array.from({ length: 31 }, (_, i) => {
            let day = `Ngày ${String(i + 1).padStart(2, "0")}`;
            let dayData = rawData.filter(d => d["Ngày trong tháng"] === day);
            let totalSales = d3.sum(dayData, d => +d["Thành tiền"]);
            let totalQuantity = d3.sum(dayData, d => +d["SL"]);
            let distinctDays = new Set(dayData.map(d => d["Thời gian tạo đơn"].split(' ')[0]));

            let avgSales = distinctDays.size ? totalSales / distinctDays.size : 0;
            let avgQuantity = distinctDays.size ? totalQuantity / distinctDays.size : 0;

            return { 
                key: day, 
                avgSales: avgSales, 
                avgQuantity: avgQuantity 
            };
        });

        const margin = { top: 70, right: 50, bottom: 120, left: 100 }, // 🟢 Tăng top để chứa tiêu đề
              width  = 1300 - margin.left - margin.right,
              height = 550 - margin.top - margin.bottom;

        const svg = d3.select("#chart").append("svg")
                      .attr("width", width + margin.left + margin.right)
                      .attr("height", height + margin.top + margin.bottom)
                      .append("g")
                      .attr("transform", `translate(${margin.left},${margin.top})`);

        // 🟢 Thêm tiêu đề trực tiếp vào SVG
        svg.append("text")
           .attr("x", width / 2)
           .attr("y", -30) 
           .attr("text-anchor", "middle")
           .style("font-size", "20px")
           .style("font-weight", "bold")
           .style("fill", "#00A896")
           .text("Doanh số bán hàng trung bình theo Ngày trong tháng");

        const x = d3.scaleBand().domain(salesByDay.map(d => d.key)).range([0, width]).padding(0.4);
        const y = d3.scaleLinear().domain([0, d3.max(salesByDay, d => d.avgSales)]).nice().range([height, 0]);

        // Sử dụng bảng màu đa dạng hơn
        const color = d3.scaleOrdinal(d3.schemeTableau10).domain(salesByDay.map(d => d.key));

        // Tooltip
        const tooltip = d3.select("body").append("div")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "#fff")
            .style("padding", "6px")
            .style("border-radius", "5px")
            .style("font-size", "12px")
            .style("visibility", "hidden");

        // Trục X
        svg.append("g")
           .attr("class", "axis x-axis")
           .attr("transform", `translate(0,${height})`)
           .call(d3.axisBottom(x))
           .selectAll("text")
           .attr("transform", "rotate(-30)")
           .style("text-anchor", "end")
           .style("font-size", "12px");

        // Trục Y
        svg.append("g")
           .attr("class", "axis y-axis")
           .call(d3.axisLeft(y)
           .ticks(d3.max(salesByDay, d => d.avgSales) / 5000000)
           .tickFormat(d => d3.format(",.0f")(d / 1000000) + "M"));

        // Vẽ cột
        svg.selectAll(".bar")
           .data(salesByDay)
           .enter().append("rect")
           .attr("class", "bar")
           .attr("x", d => x(d.key))
           .attr("y", d => y(d.avgSales))
           .attr("width", x.bandwidth())
           .attr("height", d => height - y(d.avgSales))
           .attr("fill", d => color(d.key))
           .on("mouseover", function(event, d) {
               tooltip.style("visibility", "visible")
                   .html(` 
                       <strong>Ngày:</strong> ${d.key}<br>
                       <strong>Doanh số bán:</strong> ${d3.format(".1f")(d.avgSales / 1000000)} triệu VND<br>
                       <strong>Trung bình số lượng bán:</strong> ${d3.format(",")(Math.round(d.avgQuantity))} SKUs<br>
                   `);
           })
           .on("mousemove", function(event) {
               tooltip.style("top", `${event.pageY - 10}px`)
                   .style("left", `${event.pageX + 10}px`);
           })
           .on("mouseout", function() {
               tooltip.style("visibility", "hidden");
           });

        // Nhãn trên cột (hiển thị doanh số làm tròn đến 1 chữ số)
        svg.selectAll(".bar-label")
            .data(salesByDay)
            .enter().append("text")
            .attr("class", "bar-label")
            .attr("x", d => (x(d.key) + x.bandwidth() / 2) - 20)
            .attr("y", d => y(d.avgSales) + 10) // Đặt nhãn bên trong cột, ngay trên cùng
            .attr("text-anchor", "middle")
            .attr("transform", d => `rotate(-90, ${x(d.key) + x.bandwidth() / 2}, ${y(d.avgSales) + 5})`) // Xoay 90 độ
            .style("font-size", "12px")
            .style("fill", "white") // Đổi màu chữ thành trắng
            .style("font-weight", "bold")
            .text(d => d3.format(".1f")(d.avgSales / 1000000) + " tr");
     
    }).catch(error => console.error("Lỗi khi đọc CSV:", error));
}

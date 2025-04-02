function loadQ4Chart() {  
    d3.select("#chart").html("");
    d3.select("#legend").html("");

    d3.json("/visualize/").then(function(rawData) {
        const daysOfWeek = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

        function getDayOfWeek(dateString) {
            const date = new Date(dateString);
            const day = date.getDay();
            return daysOfWeek[day === 0 ? 6 : day - 1];
        }

        rawData.forEach(d => {
            d["Ngày trong tuần"] = getDayOfWeek(d["Thời gian tạo đơn"]);
        });

        let salesByDay = daysOfWeek.map(day => {
            const dayData = rawData.filter(d => d["Ngày trong tuần"] === day);
            const totalSales = d3.sum(dayData, d => +d["Thành tiền"]);
            const totalQuantity = d3.sum(dayData, d => +d["SL"]);
            const distinctDays = new Set(dayData.map(d => d["Thời gian tạo đơn"].split(' ')[0]));
            const avgSales = Math.round(totalSales / distinctDays.size);
            const avgQuantity = Math.round(totalQuantity / distinctDays.size);
            return { key: day, avgSales, avgQuantity };
        });

        const margin = { top: 70, right: 50, bottom: 70, left: 100 }, // 🟢 Tăng top để chứa tiêu đề
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
           .text("Doanh số bán hàng theo Ngày trong tuần");

        const x = d3.scaleBand().domain(daysOfWeek).range([0, width]).padding(0.2);
        const y = d3.scaleLinear().domain([0, d3.max(salesByDay, d => d.avgSales)]).nice().range([height, 0]);
        const color = d3.scaleOrdinal(d3.schemeCategory10).domain(daysOfWeek);

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
           .style("text-anchor", "middle");

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
                       <strong>Doanh số bán:</strong> ${d3.format(",")(d.avgSales)} VND<br>
                       <strong>Trung bình số lượng bán:</strong> ${d3.format(",")(d.avgQuantity)} SKUs<br>
                   `);
           })
           .on("mousemove", function(event) {
               tooltip.style("top", `${event.pageY - 10}px`)
                   .style("left", `${event.pageX + 10}px`);
           })
           .on("mouseout", function() {
               tooltip.style("visibility", "hidden");
           });

        // Nhãn trên cột (hiển thị theo triệu VND)
        svg.selectAll(".bar-label")
           .data(salesByDay)
           .enter().append("text")
           .attr("class", "bar-label")
           .attr("x", d => x(d.key) + x.bandwidth() / 2)
           .attr("y", d => y(d.avgSales) - 10)
           .attr("text-anchor", "middle")
           .style("font-size", "11px")
           .text(d => d3.format(",.0f")(d.avgSales) + " VND");
    }).catch(error => console.error("Lỗi khi đọc CSV:", error));
}

function loadQ8Chart() {     
    d3.select("#chart").html("");
    d3.select("#legend").html("");

    d3.json("/visualize/").then(function(data) {
        const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");

        // 🟢 Tính tổng số đơn hàng trong mỗi tháng
        const ordersByMonth = d3.rollup(
            data,
            (v) => new Set(v.map(d => d["Mã đơn hàng"])).size,
            (d) => d3.timeFormat("%Y-%m")(parseTime(d["Thời gian tạo đơn"])) 
        );

        // 🟢 Tính xác suất bán hàng theo nhóm hàng từng tháng
        const probabilityByGroupMonth = d3.rollup(
            data,
            (v) => {
                const month = d3.timeFormat("%Y-%m")(parseTime(v[0]["Thời gian tạo đơn"]));
                const uniqueOrders = new Set(v.map(d => d["Mã đơn hàng"])).size;
                return {
                    probability: uniqueOrders / ordersByMonth.get(month),
                    totalOrders: uniqueOrders 
                };
            },
            (d) => d3.timeFormat("%Y-%m")(parseTime(d["Thời gian tạo đơn"])),
            (d) => `[${d["Mã nhóm hàng"]}] ${d["Tên nhóm hàng"]}`
        );

        // 🟢 Chuyển đổi dữ liệu thành mảng { month, group, probability }
        let dataset = [];
        probabilityByGroupMonth.forEach((groups, month) => {
            groups.forEach((values, group) => {
                dataset.push({
                    month: month,
                    monthLabel: `Tháng ${String(month.split('-')[1]).padStart(2, "0")}`,
                    group: group,
                    probability: values.probability,
                    probabilityFormatted: (values.probability * 100).toFixed(1) + "%", 
                    totalOrders: values.totalOrders
                });
            });
        });

        dataset.sort((a, b) => d3.ascending(a.month, b.month));

        const margin = { top: 50, right: 250, bottom: 50, left: 100 },
              width  = 1150 - margin.left - margin.right,
              height = 500 - margin.top - margin.bottom;

        const svg = d3.select("#chart").append("svg")
                      .attr("width", width + margin.left + margin.right)
                      .attr("height", height + margin.top + margin.bottom)
                      .append("g")
                      .attr("transform", `translate(${margin.left},${margin.top})`);

        // 🟢 Thêm tiêu đề vào SVG
        svg.append("text")
           .attr("x", width / 2)
           .attr("y", -20)
           .attr("text-anchor", "middle")
           .style("font-size", "20px")
           .style("font-weight", "bold")
           .style("fill", "#00A896")
           .text("Xác suất bán hàng của Nhóm hàng theo Tháng");

        const x = d3.scalePoint().domain([...new Set(dataset.map(d => d.monthLabel))]).range([0, width]).padding(0.5);
        const y = d3.scaleLinear().domain([0, d3.max(dataset, d => d.probability)]).nice().range([height, 0]);

        const color = d3.scaleOrdinal(d3.schemeTableau10).domain([...new Set(dataset.map(d => d.group))]);

        // Nhóm dữ liệu theo từng nhóm hàng
        const nestedData = d3.groups(dataset, d => d.group);

        // Tooltip
        const tooltip = d3.select("body").append("div")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "#fff")
            .style("padding", "6px")
            .style("border-radius", "5px")
            .style("font-size", "12px")
            .style("visibility", "hidden");

        // Vẽ đường cho từng nhóm hàng
        nestedData.forEach(([group, values]) => {
            const line = d3.line()
                .x(d => x(d.monthLabel))
                .y(d => y(d.probability));

            svg.append("path")
                .datum(values)
                .attr("fill", "none")
                .attr("stroke", color(group))
                .attr("stroke-width", 2)
                .attr("d", line);

            const maxPoints = values.sort((a, b) => d3.descending(a.probability, b.probability)).slice(0, 3);
            maxPoints.forEach(maxPoint => {
                svg.append("circle")
                    .attr("cx", x(maxPoint.monthLabel))
                    .attr("cy", y(maxPoint.probability))
                    .attr("r", 5)
                    .attr("fill", color(group))
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 2);
            });
        });

        // Tooltip xử lý
        svg.selectAll(".dot")
           .data(dataset)
           .enter().append("circle")
           .attr("class", "dot")
           .attr("cx", d => x(d.monthLabel))
           .attr("cy", d => y(d.probability))
           .attr("r", 4)
           .attr("fill", d => color(d.group))
           .on("mouseover", function(event, d) {
               tooltip.style("visibility", "visible")
                   .html(`
                       <strong>${d.monthLabel} | Nhóm hàng: ${d.group}</strong><br>
                       <strong>SL Đơn Bán:</strong> ${d.totalOrders}<br>
                       <strong>Xác suất Bán:</strong> ${d.probabilityFormatted}
                   `);
           })
           .on("mousemove", function(event) {
               tooltip.style("top", `${event.pageY - 10}px`)
                   .style("left", `${event.pageX + 10}px`);
           })
           .on("mouseout", function() {
               tooltip.style("visibility", "hidden");
           });

        // Trục X
        svg.append("g")
           .attr("transform", `translate(0, ${height})`)
           .call(d3.axisBottom(x));

        // Trục Y
        svg.append("g")
           .call(d3.axisLeft(y).ticks(6).tickFormat(d => (d * 100).toFixed(0) + "%"));

        // 🟢 Fix Container Legend
        const legendContainer = d3.select("#legend")
            .style("display", "flex")
            .style("flex-wrap", "wrap")
            .style("gap", "10px")
            .style("padding", "10px")
            .style("border", "1px solid #ccc")
            .style("background", "#f9f9f9")
            .style("width", "auto");

        const legend = legendContainer.selectAll(".legend-item")
            .data(color.domain())
            .enter()
            .append("div")
            .attr("class", "legend-item")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "5px");

        legend.append("div")
            .style("width", "14px")
            .style("height", "14px")
            .style("background-color", d => color(d))
            .style("border-radius", "3px");

        legend.append("span")
            .style("font-size", "12px")
            .style("color", "#333")
            .text(d => d);

    }).catch(error => console.error("Lỗi khi đọc CSV:", error));
}

function loadQ9Chart() {  
    d3.select("#chart").html("");
    d3.select("#legend").html("");

    // 🟢 Tạo một khung riêng biệt cho tiêu đề
    d3.select("#chart")
      .append("div")
      .attr("id", "title-container")
      .style("display", "flex")
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("width", "100%")
      .style("background-color", "#2a5d87")
      .style("color", "#ffffff")
      .style("font-size", "22px")
      .style("font-weight", "bold")
      .style("padding", "15px 10px")
      .style("border-radius", "5px")
      .style("margin-bottom", "15px")
      .text("Xác suất bán hàng của Mặt hàng theo Nhóm hàng");

    // 🟢 Tạo khung riêng chứa tất cả các biểu đồ
    const chartContainer = d3.select("#chart")
                              .append("div")
                              .attr("id", "chart-container")
                              .style("display", "grid")
                              .style("grid-template-columns", "repeat(auto-fit, minmax(550px, 1fr))")
                              .style("gap", "10px");

    // 🟢 Tạo tooltip
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)") // Nền đen mờ
        .style("color", "#fff") // Chữ trắng
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("visibility", "hidden")
        .style("pointer-events", "none") // Tránh gây cản trở chuột
        .style("white-space", "pre-line"); // Xuống dòng tự động trong tooltip

    d3.json("/visualize/").then(function (data) {
        const ordersByGroup = d3.rollup(
            data,
            (v) => new Set(v.map(d => d["Mã đơn hàng"])).size,
            (d) => `[${d["Mã nhóm hàng"]}] ${d["Tên nhóm hàng"]}`
        );

        const probabilityByItem = d3.rollup(
            data,
            (v) => {
                const group = `[${v[0]["Mã nhóm hàng"]}] ${v[0]["Tên nhóm hàng"]}`;
                const uniqueOrders = new Set(v.map(d => d["Mã đơn hàng"])).size;
                return {
                    probability: uniqueOrders / ordersByGroup.get(group),
                    totalOrders: uniqueOrders
                };
            },
            (d) => `[${d["Mã nhóm hàng"]}] ${d["Tên nhóm hàng"]}`,
            (d) => `[${d["Mã mặt hàng"]}] ${d["Tên mặt hàng"]}`
        );

        let dataset = [];
        probabilityByItem.forEach((items, group) => {
            items.forEach((values, item) => {
                dataset.push({
                    group: group,
                    item: item,
                    probability: values.probability,
                    probabilityFormatted: (values.probability * 100).toFixed(1) + "%", 
                    totalOrders: values.totalOrders
                });
            });
        });

        const groupedData = d3.group(dataset, d => d.group);

        const margin = { top: 40, right: 50, bottom: 50, left: 210 },
              width  = 350,  
              height = 250;  

        const itemColor = d3.scaleOrdinal(d3.schemeCategory10)
                            .domain(dataset.map(d => d.item));

        groupedData.forEach((items, group) => {
            items.sort((a, b) => d3.descending(a.probability, b.probability));

            const chartDiv = chartContainer.append("div")
                                           .style("border", "1px solid #ccc")
                                           .style("padding", "10px")
                                           .style("background", "#f9f9f9")
                                           .style("border-radius", "5px")
                                           .style("overflow", "auto");

            chartDiv.append("h3")
                    .text(group)
                    .style("color", "#2a5d87")
                    .style("text-align", "center")
                    .style("margin-bottom", "10px");

            const svg = chartDiv.append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            const x = d3.scaleLinear()
                        .domain([0, d3.max(items, d => d.probability)])
                        .range([0, width]);

            const y = d3.scaleBand()
                        .domain(items.map(d => d.item))
                        .range([0, height])
                        .padding(0.2);

            svg.selectAll(".bar")
               .data(items)
               .enter()
               .append("rect")
               .attr("class", "bar")
               .attr("y", d => y(d.item))
               .attr("width", d => x(d.probability))
               .attr("height", y.bandwidth())
               .attr("fill", d => itemColor(d.item))
               .on("mouseover", function (event, d) {
                   tooltip.style("visibility", "visible")
                   .html(` 
                    <strong>Mặt hàng:</strong> ${d.item}<br>
                    <strong>Nhóm hàng:</strong> ${d.group}<br>
                    <strong>SL đơn bán:</strong> ${d3.format(",")(d.totalOrders)}<br>  
                    <strong>Xác suất bán/ Nhóm hàng:</strong> ${d.probabilityFormatted}<br>
                `);
                   

               })
               .on("mousemove", function (event) {
                   tooltip.style("top", `${event.pageY - 10}px`)
                          .style("left", `${event.pageX + 10}px`);
               })
               .on("mouseout", function () {
                   tooltip.style("visibility", "hidden");
               });

            svg.selectAll(".label")
               .data(items)
               .enter()
               .append("text")
               .attr("class", "label")
               .attr("x", d => x(d.probability) + 5)
               .attr("y", d => y(d.item) + y.bandwidth() / 2)
               .attr("dy", "0.35em")
               .style("font-size", "12px")
               .style("fill", "#333")
               .text(d => d.probabilityFormatted);

            svg.append("g")
               .call(d3.axisLeft(y).tickSize(0).tickPadding(5))
               .selectAll("text")
               .style("font-size", "11px");

            svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".0%")));
        });

    }).catch(error => console.error("Lỗi khi đọc CSV:", error));
}

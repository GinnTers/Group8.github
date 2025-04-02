function loadQ11Chart() {
    d3.select("#chart").html("");

    d3.json("/visualize/").then(function (data) {
        // Tính số lần mua hàng của từng khách hàng
        const purchaseFrequency = d3.rollup(
            data,
            v => new Set(v.map(d => d["Mã đơn hàng"])).size, // Số lần mua hàng
            d => d["Mã khách hàng"]
        );

        // Tính số khách hàng theo số lần mua hàng
        const customerCountByPurchases = d3.rollup(
            [...purchaseFrequency.values()],
            v => v.length, // Đếm số lượng khách hàng có cùng số lần mua hàng
            d => d
        );

        // Chuyển đổi dữ liệu thành mảng để vẽ biểu đồ
        let dataset = Array.from(customerCountByPurchases, ([purchases, customers]) => ({
            purchases: +purchases,
            customers: +customers
        })).sort((a, b) => d3.ascending(a.purchases, b.purchases));

        const margin = { top: 50, right: 50, bottom: 50, left: 100 },
            width = 1200 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

        const svg = d3.select("#chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Thêm tiêu đề
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .style("fill", "#00A896")
            .text("Phân phối Lượt mua hàng");

        const x = d3.scaleBand().domain(dataset.map(d => d.purchases)).range([0, width]).padding(0.2);
        const y = d3.scaleLinear().domain([0, d3.max(dataset, d => d.customers)]).nice().range([height, 0]);

        // Tooltip
        const tooltip = d3.select("body").append("div")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "#fff")
            .style("padding", "8px")
            .style("border-radius", "5px")
            .style("font-size", "12px")
            .style("visibility", "hidden");

        // Vẽ cột
        svg.selectAll(".bar")
            .data(dataset)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.purchases))
            .attr("y", d => y(d.customers))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.customers))
            .attr("fill", "#4B8BBE")
            .on("mouseover", function (event, d) {
                tooltip.style("visibility", "visible")
                    .html(`
                        <strong>Đã mua ${d.purchases} lần</strong><br>
                        <strong>Số lượng KH:</strong> ${d.customers}
                    `);
            })
            .on("mousemove", function (event) {
                tooltip.style("top", `${event.pageY - 10}px`)
                    .style("left", `${event.pageX + 10}px`);
            })
            .on("mouseout", function () {
                tooltip.style("visibility", "hidden");
            });

        // Trục X
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x).tickFormat(d => d));

        // Trục Y
        svg.append("g")
            .call(d3.axisLeft(y).ticks(6));

    }).catch(error => console.error("Lỗi khi đọc CSV:", error));
}

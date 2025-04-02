function loadQ7Chart() {     
    d3.select("#chart").select("svg").remove();
    d3.select("#legend").html("");

    d3.json("/visualize/").then(function(data) {
        const totalOrders = new Set(data.map(d => d["Mã đơn hàng"])).size; 

        // Tính xác suất bán hàng theo nhóm hàng
        const probabilityByGroup = d3.rollup(
            data,
            (v) => {
                // 🟢 Số lượng đơn hàng bán trong mỗi nhóm hàng (đếm distinct Mã đơn hàng)
                const uniqueOrders = new Set(v.map(d => d["Mã đơn hàng"])).size;

                return {
                    probability: uniqueOrders / totalOrders, // Xác suất bán hàng (dạng số thập phân)
                    totalOrders: uniqueOrders // ✅ Số lượng đơn bán (không phải SL bán)
                };
            },
            d => `[${d["Mã nhóm hàng"]}] ${d["Tên nhóm hàng"]}`
        );

        // Chuyển thành mảng và sắp xếp theo xác suất giảm dần
        const dataset = Array.from(probabilityByGroup, ([group, values]) => ({
            item: group,
            probability: values.probability, // Xác suất bán hàng (dạng số)
            probabilityFormatted: (values.probability * 100).toFixed(1) + "%", // Xác suất hiển thị %
            totalOrders: values.totalOrders, // ✅ Số lượng đơn bán đúng
        })).sort((a, b) => d3.descending(a.probability, b.probability));

        const margin = {top: 50, right: 200, bottom: 100, left: 100};
        const width = 1300 - margin.left - margin.right;
        const height = 560 - margin.top - margin.bottom;

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
           .attr("fill", "#00A896")
           .text("Xác suất bán hàng theo Nhóm hàng");

        const y = d3.scaleBand().domain(dataset.map(d => d.item)).range([0, height]).padding(0.2);
        const x = d3.scaleLinear().domain([0, d3.max(dataset, d => d.probability)]).nice().range([0, width]);

        const color = d3.scaleOrdinal(d3.schemeTableau10).domain(dataset.map(d => d.item));

        // Tooltip
        const tooltip = d3.select("body").append("div")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "#fff")
            .style("padding", "6px")
            .style("border-radius", "5px")
            .style("font-size", "12px")
            .style("visibility", "hidden");

        // Trục Y
        svg.append("g")
           .call(d3.axisLeft(y).tickSize(0).tickPadding(10))
           .attr("class", "axis-label");

        // Trục X
        svg.append("g")
           .attr("transform", `translate(0, ${height})`)
           .call(d3.axisBottom(x).ticks(5).tickFormat(d => (d * 100).toFixed(1) + "%"));

        // Vẽ cột
        svg.selectAll(".bar")
           .data(dataset)
           .enter().append("rect")
           .attr("class", "bar")
           .attr("y", d => y(d.item))
           .attr("width", d => x(d.probability))
           .attr("height", y.bandwidth())
           .attr("fill", d => color(d.item))
           .on("mouseover", function(event, d) {
               tooltip.style("visibility", "visible")
                   .html(` 
                       <strong>Nhóm hàng:</strong> ${d.item}<br>
                       <strong>Số lượng đơn bán:</strong> ${d3.format(",")(d.totalOrders)}<br>  
                       <strong>Xác suất bán:</strong> ${d.probabilityFormatted}<br>
                   `);
           })
           .on("mousemove", function(event) {
               tooltip.style("top", `${event.pageY - 10}px`)
                   .style("left", `${event.pageX + 10}px`);
           })
           .on("mouseout", function() {
               tooltip.style("visibility", "hidden");
           });

        // Nhãn trên cột (hiển thị xác suất %)
        svg.selectAll(".bar-label")
           .data(dataset)
           .enter().append("text")
           .attr("class", "bar-label")
           .attr("x", d => x(d.probability) + 5)
           .attr("y", d => y(d.item) + y.bandwidth() / 2)
           .attr("dy", "0.35em")
           .text(d => d.probabilityFormatted)
           .style("font-size", "12px")
           .style("fill", "black");
    }).catch(error => console.error("Lỗi khi đọc CSV:", error));
}
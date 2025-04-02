function loadOrderByObjectiveChart() {
    d3.select("#chart").html("");
    d3.select("#legend").html("");
  
    d3.json("/visualize/").then(function(data) {
      // Tính toán kích thước
      const containerWidth = document.getElementById("chart").clientWidth;
      const margin = { top: 70, right: 250, bottom: 50, left: 50 };
      const width = containerWidth - margin.left - margin.right;
      const height = 560 - margin.top - margin.bottom;
  
      // Tạo SVG
      const svg = d3.select("#chart")
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
      // Thêm tiêu đề
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .style("fill", "#00A896")
        .text("Số lượng đơn hàng theo mục đích mua sắm");
  
      // Xử lý dữ liệu
      const ordersByObjective = d3.rollup(data,
        v => new Set(v.map(d => d["Mã đơn hàng"])).size,
        d => d["Mục đích"]
      );
  
      const dataset = Array.from(ordersByObjective, ([objective, orderCount]) => ({
        objective,
        orderCount
      })).sort((a, b) => d3.descending(a.orderCount, b.orderCount));
  
      const colorScale = d3.scaleOrdinal()
        .domain(dataset.map(d => d.objective))
        .range(["#00A896", "#E63946", "#457B9D", "#F4A261", "#FFCA3A", "#1D3557"]);
  
      // Tạo trục
      const x = d3.scaleBand()
        .domain(dataset.map(d => d.objective))
        .range([0, width])
        .padding(0.2);
  
      const y = d3.scaleLinear()
        .domain([0, d3.max(dataset, d => d.orderCount)])
        .range([height, 0]);
  
      svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "15px"); 
  
      svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d3.format(".0f")));
  
      // Tạo tooltip
      const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "6px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("visibility", "hidden");
  
      // Vẽ biểu đồ
      svg.selectAll(".bar")
        .data(dataset)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.objective))
        .attr("y", d => y(d.orderCount))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.orderCount))
        .attr("fill", d => colorScale(d.objective))
        .on("mouseover", function(event, d) {
          tooltip.style("visibility", "visible")
            .html(`
              <strong>Mục đích:</strong> ${d.objective}<br>
              <strong>Số lượng đơn hàng:</strong> ${d3.format(",")(d.orderCount)} đơn<br>
            `);
        })
        .on("mousemove", function(event) {
          tooltip.style("top", `${event.pageY - 10}px`)
            .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", function() {
          tooltip.style("visibility", "hidden");
        });
  
      // Thêm nhãn giá trị trên cột
      svg.selectAll(".label")
        .data(dataset)
        .enter()
        .append("text")
        .attr("x", d => x(d.objective) + x.bandwidth() / 2)
        .attr("y", d => y(d.orderCount) - 5)
        .attr("text-anchor", "middle")
        .text(d => d3.format(",")(d.orderCount))
        .style("fill", "black")
        .style("font-size", "12px");
  
      // Thêm legend
      const legend = d3.select("#legend");
      legend.append("div")
        .style("font-weight", "bold")
        .style("margin-bottom", "5px")
        .text("Mục đích mua sắm");
  
      const legendItems = legend.selectAll(".legend-item")
        .data(dataset)
        .enter()
        .append("div")
        .attr("class", "legend-item")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin", "5px 0");
  
      legendItems.append("div")
        .style("width", "18px")
        .style("height", "18px")
        .style("background-color", d => colorScale(d.objective))
        .style("margin-right", "8px");
  
      legendItems.append("span")
        .text(d => d.objective);
  
      // Thêm nhận định
      const highest = dataset[0];
      const lowest = dataset[dataset.length - 1];
      d3.select("#insights").html(`
        <h3>Nhận định phân tích</h3>
        <p>Mục đích "${highest.objective}" có số lượng đơn hàng cao nhất, đạt ${highest.orderCount} đơn.</p>
        <p>Mục đích "${lowest.objective}" có số lượng đơn hàng thấp nhất, chỉ ${lowest.orderCount} đơn.</p>
        <p>Xu hướng này cho thấy sự khác biệt rõ rệt về mục đích mua sắm, có thể phản ánh nhu cầu và thói quen tiêu dùng của khách hàng.</p>
      `);
    });
  }
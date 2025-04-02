function loadParetoChart() {
    d3.select("#chart").html("");
    d3.select("#legend").html("");
  
    d3.json("/visualize/").then(function(data) {
      // Tính toán kích thước
      const containerWidth = document.getElementById("chart").clientWidth;
      const margin = { top: 70, right: 50, bottom: 50, left: 50 };
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
        .text("Tỷ trọng doanh thu theo độ tuổi");
  
      // Xử lý dữ liệu
      // Nhóm theo độ tuổi, tính tổng doanh thu
      const revenueByAge = d3.rollup(data,
        v => d3.sum(v, d => +d["Thành tiền"]),
        d => d["Độ tuổi"]
      );
  
      // Chuyển dữ liệu thành mảng và sắp xếp giảm dần theo doanh thu
      const dataset = Array.from(revenueByAge, ([ageGroup, revenue]) => ({
        ageGroup,
        revenue
      })).sort((a, b) => d3.descending(a.revenue, b.revenue));
  
      // Tính tổng doanh thu để dùng cho tỷ lệ tích lũy
      const totalRevenue = d3.sum(dataset, d => d.revenue);
  
      // Tính tỷ lệ tích lũy
      let cumulativeRevenue = 0;
      dataset.forEach(d => {
        cumulativeRevenue += d.revenue;
        d.cumulativePercentage = (cumulativeRevenue / totalRevenue) * 100;
      });
  
      // Tạo trục
      const x = d3.scaleBand()
        .domain(dataset.map(d => d.ageGroup))
        .range([0, width])
        .padding(0.1);
  
      const yRevenue = d3.scaleLinear()
        .domain([0, d3.max(dataset, d => d.revenue)])
        .range([height, 0]);
  
      const yPercentage = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);
  
      // Trục x
      svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));
  
      // Trục y bên trái (doanh thu)
      svg.append("g")
        .call(d3.axisLeft(yRevenue).tickFormat(d => `${d / 1000000}M`));
  
      // Trục y bên phải (tỷ lệ phần trăm tích lũy)
      svg.append("g")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(yPercentage).tickFormat(d => `${d}%`));
  
      // Tạo tooltip
      const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "6px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("visibility", "hidden");
  
      // Vẽ cột (histogram)
      svg.selectAll(".bar")
        .data(dataset)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.ageGroup))
        .attr("y", d => yRevenue(d.revenue))
        .attr("width", x.bandwidth())
        .attr("height", d => height - yRevenue(d.revenue))
        .attr("fill", d => {
          const colors = ["#2ECC71", "#3498DB", "#F1C40F", "#2980B9", "#E67E22", "#1ABC9C"];
          return colors[dataset.indexOf(d) % colors.length];
        })
        .on("mouseover", function(event, d) {
          tooltip.style("visibility", "visible")
            .html(`
              <strong>Độ tuổi:</strong> ${d.ageGroup}<br>
              <strong>Doanh thu:</strong> ${d3.format(",")(d.revenue)} VND<br>
              <strong>Tỷ lệ tích lũy:</strong> ${d3.format(".1f")(d.cumulativePercentage)}%<br>
            `);
        })
        .on("mousemove", function(event) {
          tooltip.style("top", `${event.pageY - 10}px`)
            .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", function() {
          tooltip.style("visibility", "hidden");
        });
  
      // Vẽ đường tích lũy
      const line = d3.line()
        .x(d => x(d.ageGroup) + x.bandwidth() / 2)
        .y(d => yPercentage(d.cumulativePercentage));
  
      svg.append("path")
        .datum(dataset)
        .attr("fill", "none")
        .attr("stroke", "#E74C3C")
        .attr("stroke-width", 2)
        .attr("d", line);
  
      // Thêm điểm trên đường tích lũy
      svg.selectAll(".dot")
        .data(dataset)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.ageGroup) + x.bandwidth() / 2)
        .attr("cy", d => yPercentage(d.cumulativePercentage))
        .attr("r", 4)
        .attr("fill", "#E74C3C");
  
      // Thêm nhận định
      const highest = dataset[0];
      const topGroups = dataset.slice(0, 2); // Lấy 2 nhóm độ tuổi có doanh thu cao nhất
      const topCumulative = topGroups[topGroups.length - 1].cumulativePercentage;
      d3.select("#insights").html(`
        <h3>Nhận định phân tích</h3>
        <p>Nhóm độ tuổi "${highest.ageGroup}" có doanh thu cao nhất, đạt ${Math.round(highest.revenue / 1000000)} triệu VND.</p>
        <p>${topGroups.length} nhóm độ tuổi hàng đầu (${topGroups.map(d => d.ageGroup).join(", ")}) đóng góp ${Math.round(topCumulative)}% tổng doanh thu.</p>
        <p>Xu hướng này cho thấy một số nhóm độ tuổi có sức chi tiêu vượt trội, phù hợp với nguyên lý Pareto (80/20), nơi phần lớn doanh thu đến từ một số ít nhóm khách hàng.</p>
      `);
    });
  }
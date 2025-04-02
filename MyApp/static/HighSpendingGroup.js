function loadHighSpendingGroupChart() {
    d3.select("#chart").html("");
    d3.select("#legend").html("");
  
    d3.json("/visualize/").then(function(data) {
      // Tính toán kích thước
      const containerWidth = document.getElementById("chart").clientWidth;
      const margin = { top: 70, right: 250, bottom: 50, left: 300 };
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
        .text("Doanh thu trung bình theo Nhóm nghề");
  
      // Xử lý dữ liệu
      // Nhóm theo nghề nghiệp, tính tổng chi tiêu và số khách hàng duy nhất
      const spendingByProfession = d3.rollup(data,
        v => ({
          totalSpending: d3.sum(v, d => +d["Thành tiền"]),
          uniqueCustomers: new Set(v.map(d => d["Mã khách hàng"])).size
        }),
        d => d["Nghề nghiệp"]
      );
  
      // Tính doanh thu trung bình và phân loại
      const dataset = Array.from(spendingByProfession, ([profession, values]) => {
        const avgSpending = values.totalSpending / values.uniqueCustomers;
        let category;
        if (avgSpending <= 250000) {
          category = "Thấp";
        } else if (avgSpending <= 500000) {
          category = "Trung bình thấp";
        } else if (avgSpending <= 750000) {
          category = "Trung bình cao";
        } else if (avgSpending <= 1000000) {
          category = "Cao";
        } else {
          category = "Rất cao";
        }
        return { profession, avgSpending, category };
      }).sort((a, b) => d3.descending(a.avgSpending, b.avgSpending));
  
      // Tạo color scale dựa trên category
      const colorScale = d3.scaleOrdinal()
        .domain(["Rất cao", "Cao", "Trung bình cao", "Trung bình thấp", "Thấp"])
        .range(["#1D3557", "#00A896", "#E63946", "#457B9D", "#F4A261"]);
  
      // Tạo trục
      const y = d3.scaleBand()
        .domain(dataset.map(d => d.profession))
        .range([0, height - 50])
        .padding(0.2);
  
      const x = d3.scaleLinear()
        .domain([0, Math.ceil(d3.max(dataset, d => d.avgSpending) / 100000) * 100000])
        .range([0, width]);
  
      svg.append("g")
        .call(d3.axisLeft(y).tickSize(0).tickPadding(10))
        .attr("class", "axis-label");
  
      svg.append("g")
        .attr("transform", `translate(0, ${height - 50})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d => d3.format(".0f")(d / 1000) + "K"));
  
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
        .attr("y", d => y(d.profession))
        .attr("width", d => x(d.avgSpending))
        .attr("height", y.bandwidth())
        .attr("fill", d => colorScale(d.category))
        .on("mouseover", function(event, d) {
          tooltip.style("visibility", "visible")
            .html(`
              <strong>Nhóm nghề:</strong> ${d.profession}<br>
              <strong>Doanh thu trung bình:</strong> ${d3.format(",")(Math.round(d.avgSpending))} VND<br>
              <strong>Phân loại:</strong> ${d.category}<br>
            `);
        })
        .on("mousemove", function(event) {
          tooltip.style("top", `${event.pageY - 10}px`)
            .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", function() {
          tooltip.style("visibility", "hidden");
        });
  
      // Thêm nhãn giá trị
      svg.selectAll(".label")
        .data(dataset)
        .enter()
        .append("text")
        .attr("x", d => x(d.avgSpending) - 5)
        .attr("y", d => y(d.profession) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .text(d => {
          const labelText = d3.format(",.0f")(d.avgSpending / 1000) + " nghìn VND";
          return x(d.avgSpending) > 60 ? labelText : labelText.substring(0, 2) + "...";
        })
        .style("fill", "white")
        .style("font-size", "12px");
  
      // Thêm legend
      const legend = d3.select("#legend");
      legend.append("div")
        .style("font-weight", "bold")
        .style("margin-bottom", "5px")
        .text("Phân loại chi tiêu");
  
      const legendItems = legend.selectAll(".legend-item")
        .data(colorScale.domain())
        .enter()
        .append("div")
        .attr("class", "legend-item")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin", "5px 0");
  
      legendItems.append("div")
        .style("width", "18px")
        .style("height", "18px")
        .style("background-color", d => colorScale(d))
        .style("margin-right", "8px");
  
      legendItems.append("span")
        .text(d => d);
  
      // Thêm nhận định
      const highest = dataset[0];
      const lowest = dataset[dataset.length - 1];
      d3.select("#insights").html(`
        <h3>Nhận định phân tích</h3>
        <p>Nhóm nghề "${highest.profession}" có doanh thu trung bình cao nhất, đạt ${Math.round(highest.avgSpending / 1000)}K VND, thuộc phân loại "${highest.category}".</p>
        <p>Nhóm nghề "${lowest.profession}" có doanh thu trung bình thấp nhất, chỉ ${Math.round(lowest.avgSpending / 1000)}K VND, thuộc phân loại "${lowest.category}".</p>
        <p>Xu hướng này cho thấy sự khác biệt rõ rệt về khả năng chi tiêu giữa các nhóm nghề, có thể do thu nhập và nhu cầu mua sắm khác nhau.</p>
      `);
    });
  }
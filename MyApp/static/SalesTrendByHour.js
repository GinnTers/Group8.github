function loadSalesTrendByHourChart() {
    d3.select("#chart").html("");
    d3.select("#legend").html("");
  
    d3.json("/visualize/").then(function(rawData) {
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
        .text("Xu hướng doanh số trung bình theo từng khung giờ trong ngày");
  
      // Trích xuất khung giờ và tháng từ "Thời gian tạo đơn"
      function getHourRange(dateString) {
        try {
          const hour = new Date(dateString).getHours();
          return `${String(hour).padStart(2, "0")}:00-${String(hour).padStart(2, "0")}:59`;
        } catch (error) {
          return null;
        }
      }
  
      function getMonth(dateString) {
        try {
          const month = new Date(dateString).getMonth() + 1; // getMonth() trả về 0-11, cộng 1 để thành 1-12
          return `T${month}`;
        } catch (error) {
          return null;
        }
      }
  
      rawData.forEach(d => {
        d["Khung giờ"] = getHourRange(d["Thời gian tạo đơn"]);
        d["Tháng"] = getMonth(d["Thời gian tạo đơn"]);
        d["Ngày"] = d["Thời gian tạo đơn"].split(" ")[0]; // Lấy ngày để đếm số ngày duy nhất
      });
  
      // Loại bỏ các bản ghi không parse được thời gian
      const validData = rawData.filter(d => d["Khung giờ"] !== null && d["Tháng"] !== null);
  
      // Lấy danh sách các khung giờ có dữ liệu
      const existingHours = [...new Set(validData.map(d => d["Khung giờ"]))].sort();
  
      // Lọc chỉ giữ các khung giờ từ 8:00-8:59 đến 23:00-23:59
      const filteredHours = existingHours.filter(hour => {
        const hourNumber = parseInt(hour.split(":")[0], 10);
        return hourNumber >= 8 && hourNumber <= 23;
      });
  
      // Nhóm theo tháng và khung giờ, tính doanh số trung bình
      const salesByMonthAndHour = d3.groups(validData, d => d["Tháng"], d => d["Khung giờ"])
        .map(([month, hours]) => {
          const values = hours.map(([hour, records]) => {
            const totalSales = d3.sum(records, d => +d["Thành tiền"]);
            const distinctDays = new Set(records.map(d => d["Ngày"])).size;
            const avgSales = distinctDays ? totalSales / distinctDays : 0;
            return { hour, avgSales };
          });
          return { month, values };
        });
  
      // Chuẩn hóa dữ liệu: đảm bảo mỗi tháng có dữ liệu cho các khung giờ từ 8h đến 23h
      const dataset = salesByMonthAndHour.map(monthGroup => {
        const hourMap = new Map(monthGroup.values.map(d => [d.hour, d.avgSales]));
        const values = filteredHours.map(hour => ({
          hour,
          avgSales: hourMap.get(hour) || 0
        }));
        return { month: monthGroup.month, values };
      });
  
      // Sắp xếp dataset theo tháng (T1, T2, ..., T12)
      dataset.sort((a, b) => parseInt(a.month.replace("T", "")) - parseInt(b.month.replace("T", "")));
  
      // Tạo color scale cho từng tháng
      const months = dataset.map(d => d.month);
      const colorScale = d3.scaleOrdinal()
        .domain(months)
        .range([
          "#FF0000", // T1: Đỏ
          "#FF4500", // T2: Cam đậm
          "#FFA500", // T3: Cam
          "#FFD700", // T4: Vàng đậm
          "#ADFF2F", // T5: Xanh lá nhạt
          "#32CD32", // T6: Xanh lá
          "#00CED1", // T7: Xanh lam nhạt
          "#4682B4", // T8: Xanh lam
          "#1E90FF", // T9: Xanh dương
          "#6A5ACD", // T10: Tím đậm
          "#EE82EE", // T11: Tím nhạt
          "#FF69B4"  // T12: Hồng
        ]);
  
      // Tạo trục
      const x = d3.scaleBand()
        .domain(filteredHours)
        .range([0, width])
        .padding(0.1);
  
      const y = d3.scaleLinear()
        .domain([0, d3.max(dataset, d => d3.max(d.values, v => v.avgSales))])
        .range([height, 0])
        .nice();
  
      svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-45)");
  
      svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => d3.format(",.0f")(d / 1000) + "K"));
  
      // Tạo tooltip
      const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "6px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("visibility", "hidden");
  
      // Vẽ đường cho từng tháng
      const line = d3.line()
        .x(d => x(d.hour) + x.bandwidth() / 2)
        .y(d => y(d.avgSales));
  
      dataset.forEach(monthGroup => {
        svg.append("path")
          .datum(monthGroup.values)
          .attr("fill", "none")
          .attr("stroke", colorScale(monthGroup.month))
          .attr("stroke-width", 2)
          .attr("d", line);
  
        // Thêm điểm trên đường
        svg.selectAll(`.dot-${monthGroup.month}`)
          .data(monthGroup.values)
          .enter()
          .append("circle")
          .attr("class", `dot-${monthGroup.month}`)
          .attr("cx", d => x(d.hour) + x.bandwidth() / 2)
          .attr("cy", d => y(d.avgSales))
          .attr("r", 4)
          .attr("fill", colorScale(monthGroup.month))
          .on("mouseover", function(event, d) {
            tooltip.style("visibility", "visible")
              .html(`
                <strong>Tháng:</strong> ${monthGroup.month}<br>
                <strong>Khung giờ:</strong> ${d.hour}<br>
                <strong>Doanh số trung bình:</strong> ${d3.format(",.0f")(d.avgSales)} VND<br>
              `);
          })
          .on("mousemove", function(event) {
            tooltip.style("top", `${event.pageY - 10}px`)
              .style("left", `${event.pageX + 10}px`);
          })
          .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
          });
      });
  
      // Thêm legend vào SVG (ở góc trên bên phải)
      const legendSvg = svg.append("g")
        .attr("transform", `translate(${width + 100}, 10)`);
  
      // Thêm tiêu đề cho legend
      legendSvg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text("Tháng");
  
      // Thêm các mục trong legend
      const legendItemsSvg = legendSvg.selectAll(".legend-item")
        .data(months)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 30})`);
  
      legendItemsSvg.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 24)
        .attr("height", 24)
        .attr("fill", d => colorScale(d));
  
      legendItemsSvg.append("text")
        .attr("x", 34)
        .attr("y", 16)
        .style("font-size", "14px")
        .style("fill", "#333")
        .text(d => d);
  
      // Thêm nhận định
      const peakHoursByMonth = dataset.map(monthGroup => {
        const peak = monthGroup.values.reduce((max, curr) => curr.avgSales > max.avgSales ? curr : max, monthGroup.values[0]);
        return { month: monthGroup.month, peakHour: peak.hour, peakSales: peak.avgSales };
      });
  
      const insights = peakHoursByMonth.map(d => 
        `Tháng ${d.month} có doanh số trung bình cao nhất vào khung ${d.peakHour} với ${d3.format(",.0f")(d.peakSales)} VND.`
      ).join("<br>");
  
      d3.select("#insights").html(`
        <h3>Nhận định phân tích</h3>
        <p>${insights}</p>
        <p>Khung giờ cao điểm thay đổi theo từng tháng, phản ánh sự khác biệt trong hành vi mua sắm. Ví dụ, các tháng mùa lễ hội (như T12) có thể có giờ cao điểm khác so với các tháng ngày thường.</p>
        <p><strong>Quyết định:</strong> Tối ưu hóa chiến lược bán hàng và quảng cáo theo khung giờ cao điểm của từng tháng, ví dụ: tập trung vào khung ${peakHoursByMonth[0].peakHour} trong tháng ${peakHoursByMonth[0].month}.</p>
      `);
    }).catch(error => console.error("Lỗi khi đọc dữ liệu:", error));
  }
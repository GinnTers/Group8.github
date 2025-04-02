function loadCustomerTimeAgeChart() {
  d3.select("#chart").html("");
  d3.select("#legend").html(""); // Vẫn xóa nội dung cũ của #legend, nhưng không dùng nữa

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
      .text("Khách hàng có xu hướng mua hàng vào thời điểm nào trong ngày theo độ tuổi");

    // Trích xuất khung giờ từ "Thời gian tạo đơn"
    function getHourRange(dateString) {
      try {
        const hour = new Date(dateString).getHours();
        return `${String(hour).padStart(2, "0")}:00-${String(hour).padStart(2, "0")}:59`;
      } catch (error) {
        return null; // Trả về null nếu không parse được
      }
    }

    rawData.forEach(d => {
      d["Khung giờ"] = getHourRange(d["Thời gian tạo đơn"]);
    });

    // Loại bỏ các bản ghi không parse được thời gian
    const validData = rawData.filter(d => d["Khung giờ"] !== null);

    // Lấy danh sách các khung giờ có dữ liệu
    const existingHours = [...new Set(validData.map(d => d["Khung giờ"]))].sort();

    // Lọc chỉ giữ các khung giờ từ 8:00-8:59 đến 23:00-23:59
    const filteredHours = existingHours.filter(hour => {
      const hourNumber = parseInt(hour.split(":")[0], 10);
      return hourNumber >= 8 && hourNumber <= 23;
    });

    // Nhóm theo độ tuổi và khung giờ, đếm số lượng đơn hàng
    const ordersByAgeAndHour = d3.groups(validData, d => d["Độ tuổi"], d => d["Khung giờ"])
      .map(([age, hours]) => {
        const values = hours.map(([hour, records]) => ({
          hour,
          orderCount: new Set(records.map(d => d["Mã đơn hàng"])).size
        }));
        return { age, values };
      });

    // Chuẩn hóa dữ liệu: đảm bảo mỗi độ tuổi có dữ liệu cho các khung giờ từ 8h đến 23h
    const dataset = ordersByAgeAndHour.map(ageGroup => {
      const hourMap = new Map(ageGroup.values.map(d => [d.hour, d.orderCount]));
      const values = filteredHours.map(hour => ({
        hour,
        orderCount: hourMap.get(hour) || 0
      }));
      return { age: ageGroup.age, values };
    });

    // Tạo color scale cho từng độ tuổi
    const ageGroups = dataset.map(d => d.age);
    const colorScale = d3.scaleOrdinal()
      .domain(ageGroups)
      .range(["#1D3557", "#00A896", "#E63946", "#457B9D", "#F4A261", "#FFCA3A"]);

    // Tạo trục
    const x = d3.scaleBand()
      .domain(filteredHours)
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(dataset, d => d3.max(d.values, v => v.orderCount))])
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

    // Vẽ đường cho từng độ tuổi
    const line = d3.line()
      .x(d => x(d.hour) + x.bandwidth() / 2)
      .y(d => y(d.orderCount));

    dataset.forEach(ageGroup => {
      svg.append("path")
        .datum(ageGroup.values)
        .attr("fill", "none")
        .attr("stroke", colorScale(ageGroup.age))
        .attr("stroke-width", 2)
        .attr("d", line);

      // Thêm điểm trên đường
      svg.selectAll(`.dot-${ageGroup.age}`)
        .data(ageGroup.values)
        .enter()
        .append("circle")
        .attr("class", `dot-${ageGroup.age}`)
        .attr("cx", d => x(d.hour) + x.bandwidth() / 2)
        .attr("cy", d => y(d.orderCount))
        .attr("r", 4)
        .attr("fill", colorScale(ageGroup.age))
        .on("mouseover", function(event, d) {
          tooltip.style("visibility", "visible")
            .html(`
              <strong>Độ tuổi:</strong> ${ageGroup.age}<br>
              <strong>Khung giờ:</strong> ${d.hour}<br>
              <strong>Số lượng đơn hàng:</strong> ${d.orderCount} đơn<br>
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
      .attr("transform", `translate(${width - 200}, 10)`); // Đặt ở góc trên bên phải

    // Thêm tiêu đề cho legend
    legendSvg.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Độ tuổi");

    // Thêm các mục trong legend
    const legendItemsSvg = legendSvg.selectAll(".legend-item")
      .data(ageGroups)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 30})`); // Mỗi mục cách nhau 30px

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
    const peakHoursByAge = dataset.map(ageGroup => {
      const peak = ageGroup.values.reduce((max, curr) => curr.orderCount > max.orderCount ? curr : max, ageGroup.values[0]);
      return { age: ageGroup.age, peakHour: peak.hour, peakOrders: peak.orderCount };
    });

    const insights = peakHoursByAge.map(d => 
      `Nhóm tuổi "${d.age}" có số lượng đơn hàng cao nhất vào khung ${d.peakHour} với ${d.peakOrders} đơn.`
    ).join("<br>");

    d3.select("#insights").html(`
      <h3>Nhận định phân tích</h3>
      <p>${insights}</p>
      <p>Các nhóm tuổi khác nhau có thói quen mua sắm vào những khung giờ khác nhau, phản ánh lối sống và lịch trình sinh hoạt khác biệt.</p>
      <p><strong>Quyết định:</strong> Lên kế hoạch chạy quảng cáo vào đúng thời điểm khách hàng tiềm năng đang hoạt động, ví dụ: nhắm đến nhóm tuổi "${peakHoursByAge[0].age}" vào khoảng ${peakHoursByAge[0].peakHour}.</p>
    `);
  }).catch(error => console.error("Lỗi khi đọc dữ liệu:", error));
}
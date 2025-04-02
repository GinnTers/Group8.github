function loadSalesByDayAndMonthChart() {
  d3.select("#chart").html("");
  d3.select("#legend").html("");

  d3.json("/visualize/").then(function(rawData) {
    // Tính toán kích thước (cố định)
    const margin = { top: 70, right: 50, bottom: 50, left: 70 };
    const width = 1000; // Độ rộng cố định
    const height = 560; // Độ cao cố định
    const totalWidth = width + margin.left + margin.right; // Tổng độ rộng của SVG
    const totalHeight = height + margin.top + margin.bottom; // Tổng độ cao của SVG

    // Tạo SVG với kích thước cố định
    const svg = d3.select("#chart")
      .append("svg")
      .attr("width", totalWidth)
      .attr("height", totalHeight)
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
      .text("Doanh thu trung bình của các ngày trong tuần theo từng tháng");

    // Trích xuất ngày trong tuần và tháng từ "Thời gian tạo đơn"
    function getDayOfWeek(dateString) {
      try {
        const day = new Date(dateString).getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
        const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        return days[day];
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
      d["Ngày trong tuần"] = getDayOfWeek(d["Thời gian tạo đơn"]);
      d["Tháng"] = getMonth(d["Thời gian tạo đơn"]);
      d["Ngày"] = d["Thời gian tạo đơn"].split(" ")[0]; // Lấy ngày để đếm số ngày duy nhất
    });

    // Loại bỏ các bản ghi không parse được thời gian
    const validData = rawData.filter(d => d["Ngày trong tuần"] !== null && d["Tháng"] !== null);

    // Nhóm theo tháng và ngày trong tuần, tính doanh thu trung bình
    const salesByMonthAndDay = d3.groups(validData, d => d["Tháng"], d => d["Ngày trong tuần"])
      .map(([month, days]) => {
        const values = days.map(([day, records]) => {
          const totalSales = d3.sum(records, d => +d["Thành tiền"]);
          const distinctDays = new Set(records.map(d => d["Ngày"])).size;
          const avgSales = distinctDays ? totalSales / distinctDays : 0;
          return { day, avgSales };
        });
        return { month, values };
      });

    // Chuẩn hóa dữ liệu: đảm bảo mỗi tháng có dữ liệu cho tất cả các ngày trong tuần
    const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
    const months = Array.from({ length: 12 }, (_, i) => `T${i + 1}`); // T1, T2, ..., T12

    const dataset = [];
    months.forEach(month => {
      const monthData = salesByMonthAndDay.find(d => d.month === month) || { values: [] };
      const dayMap = new Map(monthData.values.map(d => [d.day, d.avgSales]));
      daysOfWeek.forEach(day => {
        dataset.push({
          month,
          day,
          avgSales: dayMap.get(day) || 0
        });
      });
    });

    // Tạo trục
    const x = d3.scaleBand()
      .domain(daysOfWeek)
      .range([0, width])
      .padding(0.05);

    const y = d3.scaleBand()
      .domain(months)
      .range([0, height])
      .padding(0.05);

    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "middle");

    svg.append("g")
      .call(d3.axisLeft(y));

    // Tạo color scale cho doanh thu trung bình
    const maxSales = d3.max(dataset, d => d.avgSales);
    const colorScale = d3.scaleSequential()
      .domain([0, maxSales])
      .interpolator(d3.interpolateBlues); // Dải màu từ trắng đến xanh đậm

    // Tạo tooltip
    const tooltip = d3.select("body").append("div")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.7)")
      .style("color", "#fff")
      .style("padding", "6px")
      .style("border-radius", "5px")
      .style("font-size", "12px")
      .style("visibility", "hidden");

    // Vẽ heatmap
    svg.selectAll(".cell")
      .data(dataset)
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", d => x(d.day))
      .attr("y", d => y(d.month))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", d => colorScale(d.avgSales))
      .on("mouseover", function(event, d) {
        tooltip.style("visibility", "visible")
          .html(`
            <strong>Tháng:</strong> ${d.month}<br>
            <strong>Ngày:</strong> ${d.day}<br>
            <strong>Doanh thu trung bình:</strong> ${d3.format(",.0f")(d.avgSales)} VND<br>
          `);
      })
      .on("mousemove", function(event) {
        tooltip.style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", function() {
        tooltip.style("visibility", "hidden");
      });

    // Thêm legend cho màu sắc (gradient)
    const legendHeight = height - 100;
    const legendWidth = 20;
    const legendSvg = svg.append("g")
      .attr("transform", `translate(${width + 20}, 50)`);

    const legendScale = d3.scaleLinear()
      .domain([0, maxSales])
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
      .tickFormat(d => d3.format(",.0f")(d / 1000) + "K");

    // Tạo gradient cho legend
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "0%")
      .attr("y2", "0%");

    linearGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colorScale(0));

    linearGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colorScale(maxSales));

    legendSvg.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#gradient)");

    legendSvg.append("g")
      .attr("transform", `translate(${legendWidth}, 0)`)
      .call(legendAxis);

    // Thêm nhận định
    const salesByMonth = d3.groups(dataset, d => d.month);
    const insightsData = salesByMonth.map(([month, data]) => {
      const highest = data.reduce((max, curr) => curr.avgSales > max.avgSales ? curr : max, data[0]);
      const lowest = data.reduce((min, curr) => curr.avgSales < min.avgSales ? curr : min, data[0]);
      return { month, highestDay: highest.day, highestSales: highest.avgSales, lowestDay: lowest.day, lowestSales: lowest.avgSales };
    });

    const insights = insightsData.map(d => 
      `Tháng ${d.month}: Ngày "${d.highestDay}" có doanh thu trung bình cao nhất (${d3.format(",.0f")(d.highestSales)} VND), trong khi ngày "${d.lowestDay}" có doanh thu thấp nhất (${d3.format(",.0f")(d.lowestSales)} VND).`
    ).join("<br>");

    const lowSalesDays = insightsData.map(d => `ngày "${d.lowestDay}" trong tháng ${d.month}`).join(", ");

    d3.select("#insights").html(`
      <h3>Nhận định phân tích</h3>
      <p>${insights}</p>
      <p>Một số ngày trong tuần có xu hướng mua sắm nhiều hơn, và xu hướng này thay đổi theo mùa. Ví dụ, các ngày cuối tuần (Thứ 7, Chủ nhật) thường có doanh thu cao hơn trong các tháng lễ hội (như T12).</p>
      <p><strong>Quyết định:</strong> Chạy các chương trình khuyến mãi vào các ngày có doanh thu thấp để thúc đẩy doanh số, ví dụ: ${lowSalesDays}.</p>
    `);
  }).catch(error => console.error("Lỗi khi đọc dữ liệu:", error));
}
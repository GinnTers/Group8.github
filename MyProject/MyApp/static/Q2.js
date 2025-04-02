function loadQ2Chart() {

    // Kiểm tra và xóa biểu đồ cũ trước khi vẽ mới
    d3.select("#chart").select("svg").remove();
    
    const margin = {top: 50, right: 200, bottom: 50, left: 300};
    const width = 1300 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    d3.json("/visualize/").then(function(data) {
        data = data.map(d => ({
            "Mã nhóm hàng": d["Mã nhóm hàng"],
            "Tên nhóm hàng": d["Tên nhóm hàng"],
            "Thành tiền": +d["Thành tiền"]
        }));
    
        let doanhThuTheoNhomHang = d3.rollup(
            data,
            v => d3.sum(v, d => d["Thành tiền"]),
            d => `[${d["Mã nhóm hàng"]}] ${d["Tên nhóm hàng"]}`
        );
    
        let doanhThuArray = Array.from(doanhThuTheoNhomHang, ([key, value]) => ({
            nhomHang: key,
            doanhThu: value
        })).sort((a, b) => b.doanhThu - a.doanhThu);
    
        const colorScale = d3.scaleOrdinal()
            .domain(doanhThuArray.map(d => d.nhomHang))
            .range(d3.schemeCategory10);
    
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(doanhThuArray, d => d.doanhThu)])
            .range([0, width]);
            
            const yScale = d3.scaleBand()
            .domain(doanhThuArray.map(d => d.nhomHang))
            .range([0, height])
            .padding(0.2);
    
        // Tooltip
        const tooltip = d3.select("body").append("div")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "#fff")
            .style("padding", "8px")
            .style("border-radius", "5px")
            .style("font-size", "12px")
            .style("visibility", "hidden");

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickValues(d3.range(0, d3.max(doanhThuArray, d => d.doanhThu) + 500000000, 500000000))
                .tickFormat(d => d >= 1000000000 ? (d / 1000000000).toFixed(3) + "M" : d3.format(".1s")(d)))
            .selectAll("text")
            .style("font-size", "12px");
    
        svg.append("g")
            .call(d3.axisLeft(yScale))
            .selectAll("text")
            .style("font-size", "12px");
        
    
        svg.selectAll(".bar")
            .data(doanhThuArray)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("y", d => yScale(d.nhomHang))
            .attr("width", d => xScale(d.doanhThu))
            .attr("height", yScale.bandwidth())
            .attr("fill", d => colorScale(d.nhomHang))
            .on("mouseover", function(event, d) {
                tooltip.style("visibility", "visible")
                    .html(`
                        <strong>Nhóm hàng:</strong> ${d.nhomHang}<br>
                        <strong>Doanh số bán:</strong> ${d3.format(",")(d.doanhThu)} VND
                    `);
            })
            .on("mousemove", function(event) {
                tooltip.style("top", `${event.pageY - 10}px`)
                    .style("left", `${event.pageX + 10}px`);
            })
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden");
            });        
            
        svg.selectAll(".bar-label")
            .data(doanhThuArray)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("x", d => xScale(d.doanhThu) - 10)
            .attr("y", d => yScale(d.nhomHang) + yScale.bandwidth() / 2 + 5)
            .attr("fill", "white")
            .attr("font-size", "12px")
            .attr("text-anchor", "end")
            .text(d => d.doanhThu >= 1000000000 ? (d.doanhThu / 1000000000).toFixed(3) + " triệu VND" : (d.doanhThu / 1e6).toFixed(0) + " triệu VND");
    
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("font-weight", "bold")
            .attr("fill","#00A896")
            .text("Doanh số bán hàng theo Nhóm hàng");
    });
    }
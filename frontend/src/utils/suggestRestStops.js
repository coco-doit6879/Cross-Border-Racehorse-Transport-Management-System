function midpoint(path) {
  if (!Array.isArray(path) || path.length < 2) throw new Error('Tuyến chưa có đủ dữ liệu để gợi ý điểm nghỉ.');
  const lengths = path.slice(1).map((p, i) => Math.hypot((p[0] - path[i][0]) * Math.cos(p[1] * Math.PI / 180), p[1] - path[i][1]));
  const target = lengths.reduce((sum, value) => sum + value, 0) / 2;
  let passed = 0;
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] > 0 && passed + lengths[i] >= target) {
      const ratio = (target - passed) / lengths[i];
      return path[i].map((value, axis) => value + (path[i + 1][axis] - value) * ratio);
    }
    passed += lengths[i];
  }
  throw new Error('Không tìm được điểm nghỉ khác với điểm đầu/cuối. Hãy chọn trạm thủ công.');
}

// Keep every chosen stop (including customs) and verify new legs with the road service.
export async function suggestRestStops(origin, destination, stops, getRoad) {
  let result = stops.map(stop => ({ ...stop }));
  let added = 0;
  for (let pass = 0; pass < 7; pass++) {
    const points = [origin, ...result.map(stop => stop.coordinates), destination];
    const road = await getRoad(points);
    if (road.legs?.length !== points.length - 1 || road.legs.some(leg => !Number.isFinite(leg.driveHours) || leg.driveHours < 0)) throw new Error('Dữ liệu thời gian từng chặng không hợp lệ. Vui lòng thử lại.');
    if (road.legs.every(leg => leg.driveHours <= 4)) return { stops: result, added };
    if (pass === 6) break;
    const next = [];
    for (let i = 0; i < road.legs.length; i++) {
      if (road.legs[i].driveHours > 4) {
        if (stops.length + added >= 48) throw new Error('Tuyến cần quá nhiều điểm nghỉ. Hãy chia nhỏ phương án.');
        const segment = await getRoad([points[i], points[i + 1]]);
        next.push({ name: `Điểm nghỉ đề xuất ${++added}`, type: 'REST_STOP', coordinates: midpoint(segment.path), minutes: 45 });
      }
      if (i < result.length) next.push(result[i]);
    }
    result = next;
  }
  throw new Error('Chưa tìm được phương án có mọi chặng ≤ 4 giờ. Hãy chọn thêm trạm thủ công.');
}

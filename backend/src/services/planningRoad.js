async function roadRoute(points) {
 const response=await fetch(`https://router.project-osrm.org/route/v1/driving/${points.map(p=>p.join(',')).join(';')}?overview=simplified&geometries=geojson&steps=false`,{signal:AbortSignal.timeout(15000)});
 const body=await response.json(),route=body.routes?.[0];
 if(!response.ok||body.code!=='Ok'||!route)throw new Error('Không tìm được đường bộ. Chọn lại trạm hoặc thử lại.');
 return {path:route.geometry.coordinates,distanceKm:route.distance/1000,driveHours:route.duration/3600,legs:route.legs.map(leg=>({distanceKm:leg.distance/1000,driveHours:leg.duration/3600})),source:'OSRM'};
}
module.exports={roadRoute};

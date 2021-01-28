function weight_factor(size, weight, passengerKm, serviceKm) {
    let tareFactor;
    let loadedfactor;
  
    // Calculate average passenger loading for each trip
    let avePaxLoading = passengerKm ? passengerKm / serviceKm : 0;
    if (isNaN(avePaxLoading)) {avePaxLoading = 0;}
  
    // Calculate average weight including average passenger loading mass 
    let loadedWeight = weight + (avePaxLoading * 80);
  
    // Emissions Impossible weighted ratio based on small or large vehicle
    if (size == "SV"){
      tareFactor = 1;
      loadedfactor = 1 + (loadedWeight / weight);
    }else{
      // If a standard sized vehicle, use a linear increasing factor that increases dependant on vehicle mass. (Emissions Impossible)
      tareFactor = (0.00004711 * weight) + 0.446;
      loadedfactor = (0.00004711 * loadedWeight) + 0.446;
    }
  
    return { 'empty': tareFactor, 'loaded': loadedfactor}
  }
  
exports.weight_factor = weight_factor;  
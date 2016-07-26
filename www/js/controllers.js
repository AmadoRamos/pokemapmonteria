angular.module('starter.controllers', [])

.controller('MapCtrl', function($scope, $ionicLoading) {
  var baseURL = "https://pokemongomap-amadoramos.c9users.io";
  var options = {};
  var map = null;
  var markers = [];
  var markerCache = {};

  onLoad = function() {
    __ajax__();
  }

  $scope.reload = function(){
    console.log('reload');
    __ajax__();
  }

  // Adds a marker to the map and push to the array.
  function addMarker(options = {}) {
      var default_options = {map: map}
      for(var prop in options){
          if(options.hasOwnProperty(prop)){
              default_options[prop] = options[prop];
          }
      }
      var marker = new google.maps.Marker(default_options);
      markers.push(marker);
      return marker;
  }

  // Sets the map on all markers in the array.
  function setMapOnAll(map, length = null) {
      var lastIndex = markers.length -1;
      if(length != null){
          lastIndex = length;
      }
      for (var i = lastIndex; i >= 0 ; i--) {
          if(!markers[i].persist){
              markers[i].setMap(map);
              if(map == null){
                  if(markers[i].timeout != null){
                      clearTimeout(markers[i].timeout);
                  }
                  if(markers[i].key != null){
                      var cacheIndex = Object.keys(markerCache).indexOf(markers[i].key);
                      if(cacheIndex >= 0){
                          delete markerCache[markers[i].key];
                      }
                  }
                  markers.slice(i, 1);
              }
          }
      }
  }

  // Removes the markers from the map, but keeps them in the array.
  function clearMarkers() {
      setMapOnAll(null);
  }

  // Shows any markers currently in the array.
  function showMarkers() {
      setMapOnAll(map);
  }

  // Deletes all markers in the array by removing references to them.
  function deleteMarkers(length) {
      setMapOnAll(null, length);
  }

  function createMap(){
      if(map == null && google != null && google.maps != null){
          if(options.identifier != null){
              map = new google.maps.Map(
                  document.getElementById(options["identifier"]), {
                      center: new google.maps.LatLng(options["lat"], options["lng"]),
                      zoom: options["zoom"],
                      mapTypeId: google.maps.MapTypeId.ROADMAP,
                      zoomControl: true,
                      mapTypeControl: false,
                      scaleControl: true,
                      streetViewControl: false,
                      rotateControl: true,
                      fullscreenControl: false
              });
          }
      }
  }
  function updateMap(){
      // A new map is created because the original one isn't saved
      createMap();
      // Requests the data and populates the map
      $.get(baseURL + "/data", function(response){
          var json_obj = $.parseJSON(response);
          var now = new Date();
          
          for (var index in json_obj) {
              var item = json_obj[index];
              
              var key = item["type"]+item["key"];
              if(Object.keys(markerCache).indexOf(key) >= 0){
                  var needs_replacing = false;
                  if(item["type"] == "gym" && item["icon"] != markerCache[key].item.icon){
                      (function(_marker){setTimeout(_marker.setMap(null), 500)})(markerCache[key].marker);
                      needs_replacing = true;
                  }
                  if((markerCache[key].item.lat != item["lat"] || markerCache[key].item.lng != item['lng'])){

                      console.log("Warning: object with identical key has different coordinates please report bug", key);
                      needs_replacing = true;
                  }
                  if (markerCache[key].item.type != item["type"] || (item["infobox"] != null && markerCache[key].item["infobox"] != null && item["infobox"] != markerCache[key].item["infobox"])) {
                      (function(_marker){setTimeout(_marker.setMap(null), 500)})(markerCache[key].marker);
                      needs_replacing = true;
      }
                  if(!needs_replacing){
                      continue;
                  }
              }
              if(markerCache[key] != null && markerCache[key].marker != null){
                  markerCache[key].marker.setMap(null);
              }
              var disappearsAt;

              if(item["disappear_time"] != null){
                  if(parseInt(item["disappear_time"]) < 0){
                      disappearsAt = -1;
                  } else {
                      disappearsAt = new Date(parseInt(item["disappear_time"] * 1000)) - now;
                      if(disappearsAt < 0){
                          continue;
                      }
                  }
              } else {
                  disappearsAt = 100000 + 500;
              }

              var marker = addMarker({
                      position: new google.maps.LatLng(item["lat"], item["lng"]),
                      map: map,
                      icon: item["icon"],
                  });
              markerCache[key] = {item: item, marker: marker};

              if (item["infobox"]) {
                  (function(_infobox, _map, _marker){
                      _marker.infoWindow = new google.maps.InfoWindow({
                          content: _infobox
                      });
                      _marker.addListener('click', function() {
                          _marker.infoWindow.open(_map, _marker);
                          _marker["persist"] = true;
                      });

                      google.maps.event.addListener(_marker.infoWindow,'closeclick',function(){
                         _marker["persist"] = null;
                      });
                  })(item["infobox"], map, marker);
              }

              (function(_marker, _disappearsAt){
                  if(_disappearsAt < 0){

                  } else {
                      var timeout = setTimeout(function(){_marker.setMap(null);}, Math.ceil(_disappearsAt))
                      _marker.timeout = timeout;
                  }
                  _marker.key = key;
              })(marker, disappearsAt);
          }
          // deleteMarkers(markers.Length - json_obj.length);
      })
  }
  window.setInterval(updateMap, 100000);

  function __ajax__ () {
    $.get(baseURL + "/config", function(response){
                  var json_obj = $.parseJSON(response);//parse JSON
                  options["lat"] = json_obj["lat"];
                  options["lng"] = json_obj["lng"];
                  options["zoom"] = json_obj["zoom"];
                  options["identifier"] = json_obj["identifier"];
                  updateMap();
              });
  }
});

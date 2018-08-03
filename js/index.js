var minClass = 0;
var maxClass = 14;
var showDryRivers = false;
var styleCounter = 0;

mapboxgl.accessToken = 'pk.eyJ1IjoiamltbXlqb2huIiwiYSI6IlhuU2gyUncifQ.Ofn8R_RfggGn_FPLtOvFhw';
$("#ex2").slider({});

var url = new URL(window.location.href);
var params = JSON.parse(decodeURI(url.search.slice(1)));
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/jimmyjohn/cjjemazx490w12rryv15r5jao',
    zoom: params['zoom'] || 4, //if search parameter doesn't exist, defaults to 4
    center: params['center'] || [-98.290,35.854] // likewise
    });

// This should be in the object delclaration.
map.setMaxBounds([[-140, 10], [-40, 70]]);
var layerList = document.getElementById('menu');
var inputs = layerList.getElementsByTagName('input');
// It's dumb to id the layer by this cryptic string. Should change it.
var oldLayer = document.getElementById('cjjemazx490w12rryv15r5jao');
function switchLayer(layer) {
    if (layer.target != oldLayer){
        var layerId = layer.target.id;
        layer.target.classList.remove('btn-outline-secondary');
        layer.target.classList.add('btn-secondary');
        oldLayer.classList.remove('btn-secondary');
        oldLayer.classList.add('btn-outline-secondary');
        map.setStyle('mapbox://styles/jimmyjohn/' + layerId);
        oldLayer = layer.target;
        styleCounter = 0;
    }
}

for (var i = 0; i < inputs.length; i++) {
    inputs[i].onclick = switchLayer;
}


// Map events to enable bookmarking of URL

map.on('moveend', function(e) {
    let url = new URL(window.location.href);
    let center = map.getCenter().toArray();
    let jsonParams = JSON.stringify({
        center : map.getCenter().toArray(),
        zoom   : Math.round(map.getZoom())
        })
    url.search = jsonParams;
    history.pushState('', '', url);

});



map.on('styledata', function(e) {
    // Waits for style to be loaded and then filters out relevent features.
    // style is being loaded 3 times for some reason
    if (styleCounter == 0) {
        hideDiffRivers();
        hideDryRivers();
        styleCounter++;
    }
});


map.on('click', function(e) {
  var box = 2;
  var features = map.queryRenderedFeatures([[e.point.x - box, e.point.y - box], [e.point.x + box, e.point.y + box]], {
    layers: ['rivers-flowing','rivers-dry']
  });

  if (!features.length) {
    return;
  };
  var feature = features[0];
  var prop = feature.properties;
  var popup = new mapboxgl.Popup({ offset: [0, -15] })
    .setLngLat(feature.geometry.coordinates[0])
    .setHTML(

    '<h3><a href="https://www.americanwhitewater.org/content/River/detail/id/'+ prop.awid +'/">' + prop.gnis_name + ' </a><h3>' +
    '<h4>class: ' + prop.difficulty + '</h4>'+
    '<h5>flow: ' + prop.flow +' cfs</h5>' +
    '<h5>gradient: ' + prop.slope + ' fpm</h5>')
    .addTo(map);
});

map.addControl(new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    bbox: [-125, 24, -66, 49.1]  //[minX, minY, maxX, maxY] limits of the lower 48
}));

function hideDryRivers() {
    if (showDryRivers){
        // hiding dry rivers
        filter = map.getFilter('rivers-dry');
        filter[2][3] = ['in','level','filteroutall'];
        map.setFilter('rivers-dry', filter);

        filter = map.getFilter('putins');
        filter[2][3] = ['in','level','high','med'];
        map.setFilter('putins', filter);
        document.getElementById("riverhide").innerHTML = 'show dry rivers';
    }
    else {
        // showing dry rivers
        filter = map.getFilter('rivers-dry');
        filter[2][3] = ['in','level','low',''];
        map.setFilter('rivers-dry', filter);

        filter = map.getFilter('putins');
        filter[2][3] = ['in','level','high','med','','low'];
        map.setFilter('putins', filter);
        document.getElementById("riverhide").innerHTML = 'hide dry rivers';
    }
}


function hideDiffRivers() {
    // hides Rivers based on difficulty ratings
    var layers = ['rivers-dry','rivers-flowing','putins']
    var arrayLength = layers.length;
    for (var i = 0; i < arrayLength; i++) {
        var layer = layers[i];
        filter = map.getFilter(layer);
        filter[2][1][2] = maxClass+0.1;
        filter[2][2][2] = minClass-0.1;
        map.setFilter(layer, filter);
    }
}
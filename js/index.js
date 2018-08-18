var minClass = 0;
var maxClass = 14;
var showDryRivers = false;
var styleCounter = 0;

mapboxgl.accessToken = 'pk.eyJ1IjoiamltbXlqb2huIiwiYSI6IlhuU2gyUncifQ.Ofn8R_RfggGn_FPLtOvFhw';
$("#ex2").slider({});

var params = {};
var map = new mapboxgl.Map({
    hash : true,
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

layerList = document.getElementById('river-hide-buttons');
inputs = layerList.getElementsByTagName('input');

function hideFeature(layer){
    let layerId = layer.target.id;
    if (map.getLayoutProperty(layerId, 'visibility') == 'none'){
        // feature is invisible so show it
        map.setLayoutProperty(layerId, 'visibility', 'visible');
        layer.target.classList.remove('btn-outline-secondary');
        layer.target.classList.add('btn-secondary');
        // if layer is dry rivers, hide put-ins as well
        if (layerId == 'rivers-dry'){
            filter = map.getFilter('putins');
            filter[2][3] = ['in','level','med','high','','low'];
            map.setFilter('putins', filter);
        }
    }
    else {
        // feature is visible so hide it
        map.setLayoutProperty(layerId, 'visibility', 'none');
        layer.target.classList.remove('btn-secondary');
        layer.target.classList.add('btn-outline-secondary');
        if (layerId == 'rivers-dry'){
            filter = map.getFilter('putins');
            filter[2][3] = ['in','level','med','high'];
            map.setFilter('putins', filter);
        }
    }

}


for (var i = 0; i < inputs.length; i++) {
    inputs[i].onclick = hideFeature;
}

map.on('styledata', function(e) {
    // Waits for style to be loaded and then filters out relevent features.
    // style is being loaded 3 times for some reason
    if (styleCounter == 0) {
        hideDiffRivers();
        styleCounter++;
    }
});

// click on map and get information about feature
map.on('click', function(e) {
    var box = 10;
    let myLayers = ['rivers-running','rivers-dry','rivers-nonww','videos','gauge','rivercount','putins'];
    var features = map.queryRenderedFeatures([[e.point.x - box, e.point.y - box], [e.point.x + box, e.point.y + box]], {
    layers: null // myLayers
    });

    if (!features.length) {
    return;
    };
    var feature = features[0];

    // properties for all info boxes
    var prop = feature.properties;
    if (feature.layer.type == 'line') {
        var popup = new mapboxgl.Popup({ offset: [0, -15] })
        // lines are a set of points so I center the info box where the user clicked instead of the actual point
        .setLngLat(e.lngLat);
    }
    else {
        var popup = new mapboxgl.Popup({ offset: [0, -15] })
        .setLngLat(feature.geometry.coordinates);
    }


    // specific properties for the different types of features
    // refer to array declaration for values
    switch(feature.layer.id) {
    case myLayers[0]:
    // flowing whitewater river
        popup.setHTML('<h3><a href="https://www.americanwhitewater.org/content/River/detail/id/'+ prop.awid +'/">' + prop.gnis_name + ' </a></h3>' +
        (prop.level  !== '' ?  '<div>level: ' + prop.level +'</div>': "")+
        '<div>class: ' + prop.difficulty + '</div>'+
        (prop.flow  !== '' ?  '<div>flow: ' + prop.flow +' cfs</div>': ""))+
        '<div>gradient: ' + prop.slope + ' fpm</div>';
        break;
    case myLayers[1]:
    // dry river
        popup.setHTML('<h3><a href="https://www.americanwhitewater.org/content/River/detail/id/'+ prop.awid +'/">' + prop.gnis_name + ' </a></h3>' +
        (prop.level  !== '' ?  '<div>level: ' + prop.level +'</div>': "")+
        '<div>class: ' + prop.difficulty + '</div>'+
        (prop.flow  !== '' ?  '<div>flow: ' + prop.flow +' cfs</div>': ""))+
        '<div>gradient: ' + prop.slope + ' fpm</div>';
        break;
    case myLayers[2]:
    // non- whitewater river
        popup.setHTML('<h3>' + prop.gnis_name + '</h3>' +
            '<div>flow: ' + prop.flow +' cfs</div>' +
            '<div>gradient: ' + prop.slope + ' fpm</div>');
        break;
    case myLayers[3]:
    // video
        popup.setHTML('<iframe width="640" height="360" allowfullscreen="allowfullscreen" src="https://www.youtube.com/embed/'+ prop.videoid +'"></iframe>');
        break;
    case myLayers[4]:
    // gauge
        popup.setHTML('<h3><a href="' + prop.url + '">'+prop.name +'</a></h3> Gauge Flow: '+prop.value + ' cfs');
        break;
    case myLayers[5]:
    // state/province summary of running whitewater rivers
        popup.setHTML(prop.name+ ' has ' + prop.runningrivers + ' running whitewater rivers.');
        break;
    case myLayers[6]:
    // putins
        popup.setHTML('i am a putin');
        break;
    default:
        ;
    }
    popup.addTo(map);
    });

map.addControl(new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    bbox: [-125, 24, -66, 49.1]  //[minX, minY, maxX, maxY] limits of the lower 48
}));


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
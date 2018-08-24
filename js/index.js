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
    center: params['center'] || [-98.290,35.854], // likewise
    minZoom: 4,
    pitchWithRotate: false,
    dragRotate: false
    });



// This should be in the object declaration.
map.setMaxBounds([[-140, 10], [-40, 70]]);
// hide dry rivers on load
map.on('load', function () {
    map.setLayoutProperty('rivers-dry', 'visibility', 'none');
    var filter = map.getFilter('putins');
    filter[1][2] = ["in","level","med","high"];
    map.setFilter('putins', filter);
    hideGauges();
});
/*var layerList = document.getElementById('menu');
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
}*/
// Flat water and dry river filters

layerList = document.getElementById('river-hide-buttons');
inputs = layerList.getElementsByTagName('input');


function hideFeature(layer){
    let target = layer.target;
    let layerId = target.id;
    if (map.getLayoutProperty(layerId, 'visibility') == 'none'){
        // feature is invisible so show it
        map.setLayoutProperty(layerId, 'visibility', 'visible');
        target.classList.remove('btn-outline-secondary');
        target.classList.add('btn-secondary');
        // if layer is dry rivers, hide put-ins as well
        if (layerId == 'rivers-dry'){
            filter = map.getFilter('putins');
            filter[1][2] = ['in','level','med','high','','low'];
            map.setFilter('putins', filter);
        }
    }
    else {
        // feature is visible so hide it
        map.setLayoutProperty(layerId, 'visibility', 'none');
        target.classList.remove('btn-secondary');
        target.classList.add('btn-outline-secondary');
        if (layerId == 'rivers-dry'){
            filter = map.getFilter('putins');
            filter[1][2] = ['in','level','med','high'];
            map.setFilter('putins', filter);
        }
    }

}


for (var i = 0; i < inputs.length; i++) {
    inputs[i].onclick = hideFeature;
}

// filter gauges. todo - join this with the hideFeature function
// function is attached in index.html


function hideGauges(){
    let target = document.getElementById('gauges');
    let layerId = 'gauge';
    if (map.getLayoutProperty(layerId, 'visibility') == 'none'){
        // feature is invisible so show it
        map.setLayoutProperty(layerId, 'visibility', 'visible');
        target.classList.remove('btn-outline-secondary');
        target.classList.add('btn-secondary');
    }
    else {
        // feature is visible so hide it
        map.setLayoutProperty(layerId, 'visibility', 'none');
        target.classList.remove('btn-secondary');
        target.classList.add('btn-outline-secondary');
    }

}

// filter by difficulty ratings

layerList = document.getElementById('difficulty-hide-buttons');
inputs = layerList.getElementsByTagName('input');

function hideDifficulty(button){
    // hides the put-ins and rivers segments based on class
    // Uses a filter to show only a fraction of each layer
    // convert roman numeral to numeric
    let roman_numeral = this.value;
    let roman_numeral_array = ['I','II','III','IV','V'];
    for (var i = 0; i < roman_numeral_array.length; i++) {
        if (roman_numeral == roman_numeral_array[i]) {break;};
    }
    i = i * 3 + 1;
    let difficult_arry = (i  !== 1 ?  [i - 1, i , i + 1]: [-1, i - 1, i , i + 1]); // Includes +/- difficulties
    let layers = ['rivers-dry','rivers-running','putins','putins-heatmap']
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        var filter = map.getFilter(layer);
        // make sure filter exists
        if (filter[filter.length - 1][1] !== "difficulty_numeric"){
            filter.push(["in", "difficulty_numeric",-2,-1,1,2,3,4,5,6,7,8,9,10,11,12,13,14]); // consider eliminating minus difficulties since they don't exist in dataset
        }
        // The toggle state is stored in the presence/absence of the difficult_arry in the filter
        let showFeature = filter[filter.length - 1].indexOf(difficult_arry[0]) == -1;
        for (var j = 0; j < difficult_arry.length; j++){
            if (showFeature){
                filter[filter.length - 1].push(difficult_arry[j]);
            }
            else {
                var index = filter[filter.length - 1].indexOf(difficult_arry[j]);
                filter[filter.length - 1].splice(index, 1);
            }
        }
        map.setFilter(layer, filter);
        // change state of button
        if (showFeature){
            // change from outline to solid
            button.currentTarget.classList.remove('btn-outline-secondary');
            button.currentTarget.classList.add('btn-secondary');
        }
        else {
            // change from solid to outline
            button.currentTarget.classList.remove('btn-secondary');
            button.currentTarget.classList.add('btn-outline-secondary');
        }


    }
}

for (var i = 0; i < inputs.length; i++) {
    inputs[i].onclick = hideDifficulty;
}

map.on('styledata', function(e) {
    // Waits for style to be loaded and then filters out relevent features.
    // style is being loaded 3 times for some reason
    // When user switches between maps, the filters need to go along with change.
    // i.e. flatwater (show/hide), dry rivers (s/h) -- include put-ins, difficulty (s/h) -- include put-itns
    if (styleCounter == 0) {
        // hideDiffRivers();
        // hide flatwater
        // hide dry rivers
        styleCounter++;
    }
});

// click on map and get information about feature
map.on('click', function(e) {
    var box = 20;
    let myLayers = ['rivers-running','rivers-dry','rivers-nonww','videos','gauge','putins'];
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
        (prop.flow  !== '' ?  '<div>flow: ' + prop.flow +' cfs</div>': ""))+// Don't understand why I need two parentheses, but it breaks otherwise
        '<div>gradient: ' + prop.slope + ' fpm</div>';
        break;
    case myLayers[1]:
    // dry river
        popup.setHTML('<h3><a href="https://www.americanwhitewater.org/content/River/detail/id/'+ prop.awid +'/">' + prop.gnis_name + ' </a></h3>' +
        (prop.level  !== '' ?  '<div>level: ' + prop.level +'</div>': "")+
        '<div>class: ' + prop.difficulty + '</div>'+
        (prop.flow  !== '' ?  '<div>flow: ' + prop.flow +' cfs</div>': ""))+ // Don't understand why I need two parentheses, but it breaks otherwise
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
        popup.setHTML('<iframe width="'+Math.min(480,$(window).width())+'" height="'+Math.min(360,$(window).height())+'" allowfullscreen="allowfullscreen" src="https://www.youtube.com/embed/'+ prop.videoid +'"></iframe>');
        popup.options.offset = null;
        break;
    case myLayers[4]:
    // gauge
        popup.setHTML('<h3><a href="' + prop.url + '">'+prop.name +'</a></h3> Gauge Flow: '+prop.value + ' cfs');
        break;
    case myLayers[5]:
    // put-ins
        popup.setHTML('<h3><a href="https://www.americanwhitewater.org/content/River/detail/id/'+ prop.awid +'/">' + prop.name + ' </a></h3>' +
        (prop.level  !== '' ?  '<div>level: ' + prop.level +'</div>': ""))
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

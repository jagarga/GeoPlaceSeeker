// Obtiene la direccion usando el Geocoder de Google Maps
function codeAddress(direction, map) {
    var geocoder = new google.maps.Geocoder();
    //var address = document.getElementById('q-adress').value;
    var address = direction;
    geocoder.geocode({
        'address': address
    }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {

            var coords = results[0].geometry.location;
            var lat = results[0].geometry.location.lat();
            var lng = results[0].geometry.location.lng();


            //var ll = new ol.proj.fromLonLat([lng, lat]);
            //var ll = new ol.Coordinate([lng, lat]);

            map.getView().setCenter(ol.proj.transform([lng, lat], 'EPSG:4326', 'EPSG:3857'));
            map.getView().setZoom(16);


        } else {
            alert('No se obtuvo dirección por la siguiente razón: ' + status);
        }
    });
}

//Funciona para llamar a los themas de las capas para el selector
function selecttheme() {


    Ext.Ajax.request({
        url: '/Home/GetThemes',
        params: "",
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        method: "GET",
        async: false,
        success: function (response) {
            //themes = response.responseText;
            var themes = [];
            var result = JSON.parse(response.responseText);

            for (var i in result['name'])
                themes.push([result['name'][i]]);

            Ext.define('capasmodel', {
                extend: 'Ext.data.Model',
                fields: [{
                    type: 'string',
                    name: 'name'
                },]
            });

            var capasmodel = '[';

            for (i = 0; i < themes.length; i++) {

                capasmodel = capasmodel + '{"name":"' + strip(themes[i].toString()) + '"},'

            }
            capasmodel = capasmodel + ']'

            capasmodel = eval(capasmodel);

            window.themes = capasmodel;


        },
        failure: function (response) {
            Ext.Msg.alert('Something to display the layers was wrong', response, Ext.emptyFn)
        }
    });
 
}

function selectgroup(selected_themes) {


    Ext.Ajax.request({
        url: '/Home/GetGroups?theme=' + selected_themes,
        dataType: "json",
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        method: "GET",
        async: false,
        success: function (response) {
            //themes = response.responseText;
            var groups = [];
            var result = JSON.parse(response.responseText);

            for (var i in result['name'])
                groups.push([result['name'][i]]);

            Ext.define('capasmodel', {
                extend: 'Ext.data.Model',
                fields: [{
                    type: 'string',
                    name: 'name'
                },]
            });

            var capasmodel = '[';

            //primero añadimos uno en blanco para deseleccionar 
            capasmodel = capasmodel + '{"name":"Select Group"},'

            for (i = 0; i < groups.length; i++) {

                capasmodel = capasmodel + '{"name":"' + strip(groups[i].toString()) + '"},'

            }
            capasmodel = capasmodel + ']'

            capasmodel = eval(capasmodel);

            window.groups = capasmodel;


        },
        failure: function (response) {
            Ext.Msg.alert('Something to display the layers was wrong', response, Ext.emptyFn)
        }
    });

}


function selectlayers(selected_themes) {


    Ext.Ajax.request({
        url: '/Home/GetLayers?theme=' + selected_themes,
        dataType: "json",
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        method: "GET",
        async: false,
        success: function (response) {
            //themes = response.responseText;
            var groups = [];
            var result = JSON.parse(response.responseText);

            for (var i in result['name'])
                groups.push([result['name'][i]]);

            Ext.define('capasmodel', {
                extend: 'Ext.data.Model',
                fields: [{
                    type: 'string',
                    name: 'name'
                },]
            });

            var capasmodel = '[';

            //primero añadimos uno en blanco para deseleccionar 
            capasmodel = capasmodel + '{"name":"Select layer"},'

            for (i = 0; i < groups.length; i++) {

                capasmodel = capasmodel + '{"name":"' + strip(groups[i].toString()) + '"},'

            }           
            capasmodel = capasmodel + ']'

            capasmodel = eval(capasmodel);

            window.single_layer = capasmodel;


        },
        failure: function (response) {
            Ext.Msg.alert('Something to display the layers was wrong', response, Ext.emptyFn)
        }
    });

}



//metodo que conecta cn postgis y le pasa la informacion a metodo que visualiza las condiciones sobre el mapa
function displaylayers_request(options, nextRegister) {

    var result;
    Ext.Ajax.request({
        url: '/Home/DisplayLayers?theme=' + options[0] + '&layergroup=' + options[1] + '&layer=' + options[2] + '&ext=' + options[3] + '&type=' + options[4] + '&buffer=' + options[5] + '&nextRegister=' + nextRegister.toString(),
        dataType: "json",
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        method: "GET",
        async: false,
        success: function (response) {
            //themes = response.responseText;
            var groups = [];
            result = JSON.parse(response.responseText);

        },
        failure: function (response) {
            Ext.Msg.alert('Something to display the layers was wrong', response, Ext.emptyFn)
        }
    });

    return result;

}


//metodo para mostrar sobre el mapa una previsualizacion de las condiciones favorables seleccionadas por el usuario
function displaylayers(favorable_options, master_favorable_options, olMap, styleFunction, geojsonPostgis) {

    
    var ex = olMap.getView().calculateExtent(olMap.getSize());
    ex = ol.proj.transformExtent(ex, ol.proj.get('EPSG:3857'), ol.proj.get('EPSG:4326'));
 

    if (master_favorable_options != null) { //se ha llamado al metodo desde la visualizacio de condiciones

        favorable_options[0] = selected_theme;
        favorable_options[1] = selected_group;
        favorable_options[2] = selected_layer;
        favorable_options[3] = ex;
        favorable_options[4] = "favorable";
        favorable_options[5] = Ext.getCmp('buffer_fav_dist').getValue();
        //master_favorable_options.push(favorable_options);

    } else { //se ha llamado al metodo desde la visualizacion general de capas
        favorable_options[0] = selected_theme_display;
        favorable_options[1] = selected_group_display;
        favorable_options[2] = selected_layer_display;
        favorable_options[3] = ex;
        favorable_options[4] = "DisplayLayers";
        favorable_options[5] = "0";
    }
    
    var nextRegister = 0;
    do {
        var result = displaylayers_request(favorable_options, nextRegister);
        for (var i in result['name']) {
            geojsonPostgis.features.push(JSON.parse(result['name'][i]));
        }
        nextRegister += result['name'].length;
    }
    while ((nextRegister % 10000) == 0);

    window.geojsonPostgis = geojsonPostgis;

    if (master_favorable_options != null) { //se ha llamado al metodo desde la visualizacio de condiciones

        var vector_Source = new ol.source.Vector({
            features: (new ol.format.GeoJSON()).readFeatures(geojsonPostgis, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })
        });

        var favorable_Layer = new ol.layer.Vector({
            source: vector_Source,
            style: styleFunction,
            name: "Favorable conditions"
        });

        olMap.addLayer(favorable_Layer);

    } else { //se ha llamado al metodo desde la visualizacion general de capas

        if (selected_group_display == null) {
            var name = selected_theme_display;
        }
        else if (selected_layer_display == null) {
            var name = selected_group_display;
        }
        else {
            var name = selected_layer_display;
        }


        var vector_Source_display = new ol.source.Vector({
            features: (new ol.format.GeoJSON()).readFeatures(geojsonPostgis, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })
        });

        var vector_Layer = new ol.layer.Vector({
            source: vector_Source_display,
            style: styleFunction,
            name: name
        });

        olMap.addLayer(vector_Layer);

    }



    //reinicializamos el geojson
    geojsonPostgis =
        {
            'type': 'FeatureCollection',
            'crs': {
                'type': 'name',
                'properties': {
                    'name': 'EPSG:3857'
                }
            },
            'features': [
                //{ 'type': 'Point', 'coordinates': [-3.7084781, 40.4113586] }
            ]
        };
}


//metodo para mostrar sobre el mapa una previsualizacion de las condiciones desfavorables seleccionadas por el usuario
function displaylayers2(disfavorable_options, master_disfavorable_options, olMap, styleFunction, geojsonPostgis) {


    var ex = olMap.getView().calculateExtent(olMap.getSize());
    ex = ol.proj.transformExtent(ex, ol.proj.get('EPSG:3857'), ol.proj.get('EPSG:4326'));


    if (master_favorable_options != null) { //se ha llamado al metodo desde la visualizacio de condiciones

        disfavorable_options[0] = selected_theme2;
        disfavorable_options[1] = selected_group2;
        disfavorable_options[2] = selected_layer2;
        disfavorable_options[3] = ex;
        disfavorable_options[4] = "disfavorable";
        disfavorable_options[5] = Ext.getCmp('buffer_disfav_dist').getValue();
        //master_favorable_options.push(favorable_options);

    } else { //se ha llamado al metodo desde la visualizacion general de capas
        disfavorable_options[0] = selected_theme_display;
        disfavorable_options[1] = selected_group_display;
        disfavorable_options[2] = selected_layer_display;
        disfavorable_options[3] = ex;
        disfavorable_options[4] = "DisplayLayers";
        disfavorable_options[5] = "0";
    }

    var nextRegister = 0;
    do {
        var result = displaylayers_request(disfavorable_options, nextRegister);
        for (var i in result['name']) {
            geojsonPostgis.features.push(JSON.parse(result['name'][i]));
        }
        nextRegister += result['name'].length;
    }
    while ((nextRegister % 10000) == 0);

    window.geojsonPostgis = geojsonPostgis;

    if (master_disfavorable_options != null) { //se ha llamado al metodo desde la visualizacio de condiciones

        var vector_Source = new ol.source.Vector({
            features: (new ol.format.GeoJSON()).readFeatures(geojsonPostgis, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })
        });

        var disfavorable_Layer = new ol.layer.Vector({
            source: vector_Source,
            style: styleFunction,
            name: "Disfavorable conditions"
        });

        olMap.addLayer(disfavorable_Layer);

    } else { //se ha llamado al metodo desde la visualizacion general de capas

        if (selected_group_display == null) {
            var name = selected_theme_display;
        }
        else if (selected_layer_display == null) {
            var name = selected_group_display;
        }
        else {
            var name = selected_layer_display;
        }


        var vector_Source_display = new ol.source.Vector({
            features: (new ol.format.GeoJSON()).readFeatures(geojsonPostgis, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })
        });

        var vector_Layer = new ol.layer.Vector({
            source: vector_Source_display,
            style: styleFunction,
            name: name
        });

        olMap.addLayer(vector_Layer);

    }



    //reinicializamos el geojson
    geojsonPostgis =
        {
            'type': 'FeatureCollection',
            'crs': {
                'type': 'name',
                'properties': {
                    'name': 'EPSG:3857'
                }
            },
            'features': [
                //{ 'type': 'Point', 'coordinates': [-3.7084781, 40.4113586] }
            ]
        };
}


function displaylayers_mutiples(favorable_options, master_favorable_options, olMap, styleFunction, geojsonPostgis) {

    var ex = olMap.getView().calculateExtent(olMap.getSize());
    ex = ol.proj.transformExtent(ex, ol.proj.get('EPSG:3857'), ol.proj.get('EPSG:4326'));

    for (j = 0; j < master_favorable_options.length; j++) {

        master_favorable_options[j][3] = ex;

        var nextRegister = 0;
        do {
            var result = displaylayers_request(master_favorable_options[j], nextRegister);
            for (var i in result['name']) {
                geojsonPostgis.features.push(JSON.parse(result['name'][i]));
            }
            nextRegister += result['name'].length;
        }
        while ((nextRegister % 10000) == 0);

        //window.geojsonPostgis = geojsonPostgis;
    }
    //alert(JSON.stringify(geojsonPostgis));
        var vector_Source = new ol.source.Vector({
            features: (new ol.format.GeoJSON()).readFeatures(geojsonPostgis, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })
        });

        if (master_favorable_options[0][4] == "favorable") {

            var favorable_Layer = new ol.layer.Vector({
                source: vector_Source,
                style: styleFunction,
                name: "Favorable conditions"
            });

            olMap.addLayer(favorable_Layer);

        }
        else {

            var disfavorable_Layer = new ol.layer.Vector({
                source: vector_Source,
                style: styleFunction,
                name: "Disfavorable conditions"
            });

            olMap.addLayer(disfavorable_Layer);

        }




    //reinicializamos el geojson
    geojsonPostgis =
        {
            'type': 'FeatureCollection',
            'crs': {
                'type': 'name',
                'properties': {
                    'name': 'EPSG:3857'
                }
            },
            'features': [
                //{ 'type': 'Point', 'coordinates': [-3.7084781, 40.4113586] }
            ]
        };
}


//funcion que a partir de las condiciones positivas o negativas calcula las zonas que cumplen dichas condiciones
function calculate_bestplace(master_favorable_options, master_disfavorable_options, olMap, styleFunction, geojsonPostgis) {

    var ex = olMap.getView().calculateExtent(olMap.getSize());
    ex = ol.proj.transformExtent(ex, ol.proj.get('EPSG:3857'), ol.proj.get('EPSG:4326'));
    var query = " SELECT ST_AsGeoJSON(ST_Transform(ST_SetSRID(ST_Difference(favorable.ST_Union,disfavorable.ST_Union),3857),4326)) FROM (SELECT(ST_Union(ST_Buffer)) FROM (";

    for (i = 0; i < master_favorable_options.length; i++) {

        if (master_favorable_options[i][1] == null) {
            query = query + "SELECT ST_Buffer(ST_Transform(ST_SetSRID(geom,4326),3857), " + master_favorable_options[i][5] + ") FROM (SELECT geom FROM(SELECT * FROM public." + master_favorable_options[i][0] + " WHERE public." + master_favorable_options[i][0] + ".geom && ST_MakeEnvelope(" + master_favorable_options[i][3] + ", 4326)) as data) as buffer2";
        }
        else if (master_favorable_options[i][2] == null) {
            query = query + "SELECT ST_Buffer(ST_Transform(ST_SetSRID(geom,4326),3857), " + master_favorable_options[i][5] + ") FROM (SELECT geom FROM(SELECT * FROM public." + master_favorable_options[i][0] + " WHERE public." + master_favorable_options[i][0] + ".geom && ST_MakeEnvelope(" + master_favorable_options[i][3] + ", 4326) AND code::text LIKE (SELECT layer_group_code from public.layer_names where layer_group='" + master_favorable_options[i][1] + "' limit 1)||'%') as buffer) as buffer2";
        }
        else {
            query = query + "SELECT ST_Buffer(ST_Transform(ST_SetSRID(geom,4326),3857), " + master_favorable_options[i][5] + ") FROM (SELECT geom FROM(SELECT * FROM public." + master_favorable_options[i][0] + " WHERE public." + master_favorable_options[i][0] + ".geom && ST_MakeEnvelope(" + master_favorable_options[i][3] + ", 4326) AND fclass = '" + master_favorable_options[i][2] + "') as layer) as buffer2";
        }

        if (i != (master_favorable_options.length - 1)) {
            query = query + " UNION ALL ";
        } else {
            query = query + " )as foo) as favorable, "
        }
    }

    query = query + "( SELECT(ST_Union(ST_Buffer)) FROM(";

    for (j = 0; j < master_disfavorable_options.length; j++) {

        if (master_disfavorable_options[j][1] == null) {
            query = query + "SELECT ST_Buffer(ST_Transform(ST_SetSRID(geom,4326),3857), " + master_disfavorable_options[j][5] + ") FROM (SELECT geom FROM(SELECT * FROM public." + master_disfavorable_options[j][0] + " WHERE public." + master_disfavorable_options[j][0] + ".geom && ST_MakeEnvelope(" + master_disfavorable_options[j][3] + ", 4326)) as data) as buffer2";
        }
        else if (master_disfavorable_options[j][2] == null) {
            query = query + "SELECT ST_Buffer(ST_Transform(ST_SetSRID(geom,4326),3857), " + master_disfavorable_options[j][5] + ") FROM (SELECT geom FROM(SELECT * FROM public." + master_disfavorable_options[j][0] + " WHERE public." + master_disfavorable_options[j][0] + ".geom && ST_MakeEnvelope(" + master_disfavorable_options[j][3] + ", 4326) AND code::text LIKE (SELECT layer_group_code from public.layer_names where layer_group='" + master_disfavorable_options[j][1] + "' limit 1)||'%') as buffer) as buffer2";
 }
        else {
            query = query + "SELECT ST_Buffer(ST_Transform(ST_SetSRID(geom,4326),3857), " + master_disfavorable_options[j][5] + ") FROM (SELECT geom FROM(SELECT * FROM public." + master_disfavorable_options[j][0] + " WHERE public." + master_disfavorable_options[j][0] + ".geom && ST_MakeEnvelope(" + master_disfavorable_options[j][3] + ", 4326) AND fclass = '" + master_disfavorable_options[j][2] + "') as layer) as buffer2";
        }

        if (j != (master_disfavorable_options.length - 1)) {
            query = query + " UNION ALL ";
        } else {
            query = query + " )as foo2) as disfavorable "
        }
    }
    
    var nextRegister = 0;
    do {
        var result = calculatezones_request(query, nextRegister);
        for (var k in result['name']) {
            geojsonPostgis.features.push(JSON.parse(result['name'][k]));
        }
        nextRegister += result['name'].length;
    }
    while ((nextRegister % 10000) == 0);

    var vector_Source = new ol.source.Vector({
        features: (new ol.format.GeoJSON()).readFeatures(geojsonPostgis, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        })
    });


        var disfavorable_Layer = new ol.layer.Vector({
            source: vector_Source,
            style: styleFunction,
            name: "Result Location"
        });

        olMap.addLayer(disfavorable_Layer);


    //reinicializamos el geojson
    geojsonPostgis =
        {
            'type': 'FeatureCollection',
            'crs': {
                'type': 'name',
                'properties': {
                    'name': 'EPSG:3857'
                }
            },
            'features': [
                //{ 'type': 'Point', 'coordinates': [-3.7084781, 40.4113586] }
            ]
        };
}


//metodo que conecta cn postgis y le pasa la informacion a metodo para cacularlas zonas que cumplen las condiciones
function calculatezones_request(query, nextRegister) {
    var result;
    Ext.Ajax.request({
        url: '/Home/CalculateZone',
        dataType: "json",
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        method: "POST",
        params: JSON.stringify({
            "query": query,
            "nextRegister": nextRegister.toString(),
        }),
        async: false,
        success: function (response) {
            //themes = response.responseText;
            var groups = [];
            result = JSON.parse(response.responseText);

        },
        failure: function (response) {
            Ext.Msg.alert('Something to display the layers was wrong', response, Ext.emptyFn)
        }
    });

    return result;

}


function strip(str) {
    return str.replace(/^\s+|\s+$/g, '');
}


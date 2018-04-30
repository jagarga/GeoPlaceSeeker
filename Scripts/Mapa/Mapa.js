Ext.require([
    'GeoExt.component.Map',
    'GeoExt.data.store.LayersTree'
]);

/**
 * A plugin for Ext.grid.column.Column s that overwrites the internal cellTpl to
 * support legends.
 */

Ext.define('BasicTreeColumnLegends', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.basic_tree_column_legend',

    /**
     * @private
     */
    originalCellTpl: Ext.clone(Ext.tree.Column.prototype.cellTpl).join(''),

    /**
     * The Xtemplate strings that will be used instead of the plain {value}
     * when rendering
     */
    valueReplacementTpl: [
        '{value}',
        '<tpl if="this.hasLegend(values.record)"><br />',
        '<tpl for="lines">',
        '<img src="{parent.blankUrl}"',
        ' class="{parent.childCls} {parent.elbowCls}-img ',
        '{parent.elbowCls}-<tpl if=".">line<tpl else>empty</tpl>"',
        ' role="presentation"/>',
        '</tpl>',
        '<img src="{blankUrl}" class="{childCls} x-tree-elbow-img">',
        '<img src="{blankUrl}" class="{childCls} x-tree-elbow-img">',
        '<img src="{blankUrl}" class="{childCls} x-tree-elbow-img">',
        '{[this.getLegendHtml(values.record)]}',
        '</tpl>'
    ],

    /**
     * The context for methods available in the template
     */
    valueReplacementContext: {
        hasLegend: function (rec) {
            var isChecked = rec.get('checked');
            var layer = rec.data;
            return isChecked && !(layer instanceof ol.layer.Group);
        },
        getLegendHtml: function (rec) {
            var layer = rec.data;
            var legendUrl = layer.get('legendUrl');
            if (!legendUrl) {
                legendUrl = 'https://geoext.github.io/geoext2/' +
                    'website-resources/img/GeoExt-logo.png';
            }
            return '<img class="legend" src="' + legendUrl + '" height="32" />';
        }
    },

    init: function (column) {
        var me = this;
        if (!(column instanceof Ext.grid.column.Column)) {
            Ext.log.warn('Plugin shall only be applied to instances of' +
                ' Ext.grid.column.Column');
            return;
        }
        var valuePlaceHolderRegExp = /\{value\}/g;
        var replacementTpl = me.valueReplacementTpl.join('');
        var newCellTpl = me.originalCellTpl.replace(
            valuePlaceHolderRegExp, replacementTpl
        );

        column.cellTpl = [
            newCellTpl,
            me.valueReplacementContext
        ];
    }
});


//VARIABLES GLOBALES

var mapComponent;
var mapPanel;
var treePanel;
var treePanel2;
var themes; //variable global para almacenar el tema de las capas elegido por el usuario en los combobox
var groups; //variable global para almacenar el grupo de las capas elegido por el usuario en los combobox
var single_layer; //variable global para almacenar la capa elegida por el usuario en los combobox
//inicializamos las varibles de las capas elegidas en las condiciones favorables y desfavorables
var selected_layer = null;
var selected_group = null;
var selected_theme = null;
var selected_layer2 = null;
var selected_group2 = null;
var selected_theme2 = null;
//variable global para almacenar la capa elegida para visualizar por el usuario en los combobox
var selected_layer_display = null;
var selected_group_display = null;
var selected_theme_display = null;

var master_favorable_options = new Array();  //array que guarda los arrays de options
var favorable_options = [selected_theme, selected_group, selected_layer, " ", " "];  //array que guarda las opciones de cada capa seleccionada para postgis
var master_disfavorable_options = new Array();  //array que guarda los arrays de options
var disfavorable_options = [selected_theme, selected_group, selected_layer, " ", " "];  //array que guarda las opciones de cada capa seleccionada para postgis


//Store para guardar las condiciones favorables
var storefavorables = Ext.create('Ext.data.Store', {
    storeId: 'favorablesStore',
    fields: ['Condition', 'Distance'],
    proxy: {
        type: 'memory',
        reader: {
            type: 'json',
            rootProperty: 'items'
        }
    }

});

//Store para guardar las condiciones desfavorables
var storedisfavorables = Ext.create('Ext.data.Store', {
    storeId: 'disfavorablesStore',
    fields: ['Condition', 'Distance'],
    proxy: {
        type: 'memory',
        reader: {
            type: 'json',
            rootProperty: 'items'
        }
    }

});

//plantilla json para añadir capas postgis
var geojsonPostgis =
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


//APLICACION PRINCIPAL
Ext.application({
    name: 'Name_application',
    launch: function () {
        //var source1;
        //var source2;
        //var source3;
        //var layer1;
        //var layer2;
        //var layer3;
        //var layer4;
        var group;
        var olMap;
        var treeStore;
        var panelleft; //panel izquierdo
        var panelright; //panel derecho
        var menu; //menu por debajo menu bootstral
        var overviewMap; //Mapa de posicion
        var ovMapPanel; //Panel para el mapa de posicion


        //source1 = new ol.source.Stamen({layer: 'watercolor'});
        //layer1 = new ol.layer.Tile({
        //    legendUrl: 'https://stamen-tiles-d.a.ssl.fastly.net/' +
        //        'watercolor/2/1/0.jpg',
        //    source: source1,
        //    name: 'Stamen Watercolor'
        //});

        //source2 = new ol.source.Stamen({layer: 'terrain-labels'});
        //layer2 = new ol.layer.Tile({
        //    legendUrl: 'https://stamen-tiles-b.a.ssl.fastly.net/' +
        //        'terrain-labels/4/4/6.png',
        //    source: source2,
        //    name: 'Stamen Terrain Labels'
        //});

        //source3 = new ol.source.TileWMS({
        //    url: 'https://ows.terrestris.de/osm-gray/service',
        //    params: {'LAYERS': 'OSM-WMS', 'TILED': true}
        //});
        //layer3 = new ol.layer.Tile({
        //    legendUrl: 'https://ows.terrestris.de/osm-gray/service?' +
        //        'SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fpng&' +
        //        'TRANSPARENT=true&LAYERS=OSM-WMS&TILED=true&WIDTH=256&' +
        //        'HEIGHT=256&CRS=EPSG%3A3857&STYLES=&' +
        //        'BBOX=0%2C0%2C10018754.171394622%2C10018754.171394622',
        //    source: source3,
        //    name: 'terrestris OSM WMS',
        //    visible: false
        //});

        //layer4 = new ol.layer.Vector({
        //    source: new ol.source.Vector(),
        //    name: 'Vector '
        //});

        source = new ol.source.OSM();
        layer = new ol.layer.Tile({
            source: source,
            name: 'OpenStreetMap Layer'
        });


        //ESTILOS GEOJSON
       
        var image = new ol.style.Circle({
            radius: 5,
            fill: null,
            stroke: new ol.style.Stroke({ color: 'blue', width: 2 })
        });

        var styles_favorable = {
            'Point': new ol.style.Style({
                image: image
            }),
            'LineString': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'green',
                    width: 1
                })
            }),
            'MultiLineString': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'green',
                    width: 1
                })
            }),
            'MultiPoint': new ol.style.Style({
                image: image
            }),
            'MultiPolygon': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'green',
                    width: 1
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(0, 255, 0, 0.25)'
                })
            }),
            'Polygon': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'green',
                    lineDash: [4],
                    width: 3
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(0, 255, 0, 0.25)'
                })
            }),
            'GeometryCollection': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'green',
                    width: 2
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(0, 255, 0, 0.25)'
                }),
                image: new ol.style.Circle({
                    radius: 10,
                    fill: null,
                    stroke: new ol.style.Stroke({
                        color: 'green'
                    })
                })
            }),
            'Circle': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'green',
                    width: 2
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(0,255,0,0.2)'
                })
            })
        };

        var styleFunction_favorable = function (feature) {
            return styles_favorable[feature.getGeometry().getType()];
        };

        var styles_disfavorable = {
            'Point': new ol.style.Style({
                image: image
            }),
            'LineString': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'red',
                    width: 1
                })
            }),
            'MultiLineString': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'red',
                    width: 1
                })
            }),
            'MultiPoint': new ol.style.Style({
                image: image
            }),
            'MultiPolygon': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'red',
                    width: 1
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(255, 0, 0, 0.25)'
                })
            }),
            'Polygon': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'red',
                    lineDash: [4],
                    width: 3
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(255, 0, 0, 0.25)'
                })
            }),
            'GeometryCollection': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'red',
                    width: 2
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(255, 0, 0, 0.25)'
                }),
                image: new ol.style.Circle({
                    radius: 10,
                    fill: null,
                    stroke: new ol.style.Stroke({
                        color: 'red'
                    })
                })
            }),
            'Circle': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'red',
                    width: 2
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(255,0,0,0.2)'
                })
            })
        };

        var styleFunction_disfavorable = function (feature) {
            return styles_disfavorable[feature.getGeometry().getType()];
        };

        var styles_zones = {
            'Point': new ol.style.Style({
                image: image
            }),
            'LineString': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'blue',
                    width: 1
                })
            }),
            'MultiLineString': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'blue',
                    width: 1
                })
            }),
            'MultiPoint': new ol.style.Style({
                image: image
            }),
            'MultiPolygon': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'blue',
                    width: 1
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(0, 0, 255, 0.25)'
                })
            }),
            'Polygon': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'blue',
                    lineDash: [4],
                    width: 3
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(0, 0, 255, 0.25)'
                })
            }),
            'GeometryCollection': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'blue',
                    width: 2
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(0, 0, 255, 0.25)'
                }),
                image: new ol.style.Circle({
                    radius: 10,
                    fill: null,
                    stroke: new ol.style.Stroke({
                        color: 'blue'
                    })
                })
            }),
            'Circle': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'blue',
                    width: 2
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(0,0,255,0.2)'
                })
            })
        };

        var styleFunction_zones = function (feature) {
            return styles_zones[feature.getGeometry().getType()];
        };

        //group = new ol.layer.Group({
        //    layers: [layer, layer2],
        //    name: 'Base Layers'
        //});

        //Proyecion del mapa
        var Projection = new ol.proj.Projection({
            code: 'EPSG:3857',
            units: 'm'
        });

        olMap = new ol.Map({
            controls: ol.control.defaults().extend([
                new ol.control.FullScreen(),
                new ol.control.ZoomToExtent({
                    //extent: [
                    //    393335.175784, 3896421.18109,
                    //    401256.8368764955, 5556421.18109
                    //]
                })
            ]),
            layers: [layer],
            view: new ol.View({
                projection: Projection,
                center: ol.proj.transform([-3.69, 40.42], 'EPSG:4326', 'EPSG:3857'),
                zoom: 12
            })
        });



        //BARRA DE HERRAMIENTAS (ACCIONES)
        var ctrl, toolbarItems = [],
            action, actions = {};

        toolbarItems.push("-");
        toolbarItems.push(Ext.create('Ext.form.field.Text', {
            id: 'textgeocode',
            value: 'Search adress'
        }));

        toolbarItems.push(Ext.create('Ext.button.Button', {
            text: 'Search',
            handler: function () {
                //alert($('#textgeocode-inputEl').val());
                var direction = $('#textgeocode-inputEl').val();
                codeAddress(direction, olMap);

            }
        }));


        //MAPA CENTRAL

        mapComponent = Ext.create('GeoExt.component.Map', {
            map: olMap,
        });

        mapPanel = Ext.create('Ext.panel.Panel', {
            region: 'center',
            layout: 'fit',
            border: true,
            items: [mapComponent],
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'top',
                items: toolbarItems
            }]
        });

        treeStore = Ext.create('GeoExt.data.store.LayersTree', {
            layerGroup: olMap.getLayerGroup()
        });


        //PANEL LATERAL IZQUIERDO
        treePanel = Ext.create('Ext.tree.Panel', {
            store: treeStore,
            border: false,
            rootVisible: false,
            hideHeaders: true,
            lines: false,
            flex: 1,
            columns: {
                header: false,
                items: [
                    {
                        xtype: 'treecolumn',
                        dataIndex: 'text',
                        flex: 1,
                        plugins: [
                            {
                                ptype: 'basic_tree_column_legend'
                            }
                        ]
                    }
                ]
            },
            fbar: {
                //style: { background:'#08088A', marginTop: '0px' , borderWidth:'0px'},
                items: [
                    {
                        //boton para el ejecutar añadir una capa postgis
                        xtype: 'button',
                        text: '<div style="color: Black">Add layer</div>',
                        height: 25,
                        //escuchador de eventos para cuando pulsamos el raton o pasamos por encima el raton
                        listeners: {
                            //evento on click
                            click: function () {

                                var favorable_options = [selected_theme_display, selected_group_display, selected_layer_display, " ", "0"];

                                selecttheme();   //funcion que hace consulta sobre postgis para obtener los nombres

                                var themestore_display = Ext.create('Ext.data.Store', {
                                    model: 'capasmodel',
                                    data: themes
                                });



                                var singlelayerstore= Ext.create('Ext.data.Store', {
                                    model: 'capasmodel',
                                    data: single_layer
                                });
        //fin obtencion variables para el combobox de temas de capas



                                Ext.create('Ext.window.Window', {
                                    title: 'Add layer to display',
                                    closable: true,
                                    //closeAction: 'hide',
                                    width: 260,
                                    //minWidth: 200,
                                    height: 200,
                                    bodyStyle: 'margin: 10px;',
                                    animCollapse: false,
                                    border: false,
                                    modal: true,

                                    items: [{

 //Selector de la tematica para desplegar el grupo de capas

                                            xtype: 'combo',
                                            fieldLabel: 'Layer Theme',
                                            id: 'selecttheme_display',
                                            store: themestore_display,
                                            displayField: 'name',
                                            value: 'Select theme',
                                            width: 230,
                                            queryMode: 'local',
                                            typeAhead: true,
                                            listeners: {
                                                select: function (combo, records) {

                                                    selected_theme_display = combo.getValue(); //sacamos el valor seleccionado
                                                    selectgroup(selected_theme_display);  //buscamos en postgis los grupos de capas de esa tema
                                                    //Añadimos un store con el resultado de esa busqueda

                                                    var groupstore = Ext.create('Ext.data.Store', {
                                                        model: 'capasmodel',
                                                        data: groups
                                                    });

                                                    Ext.getCmp('selectgroup_display').bindStore(groupstore);
                                                    Ext.getCmp('selectgroup_display').setValue(groupstore.getAt(0));
                                                    selected_layer_display = null;
                                                    selected_group_display = null;

                                                }
                                            }
                                        }, { //Selector del grupo de capas

                                            xtype: 'combo',
                                            fieldLabel: 'Layer Group',
                                            id: 'selectgroup_display',
                                            displayField: 'name',
                                            width: 230,
                                            //store: groupstore,
                                            queryMode: 'local',
                                            typeAhead: true,
                                            listeners: {
                                                select: function (combo, records) {

                                                    selected_group_display = combo.getValue(); //sacamos el valor seleccionado
                                                    selectlayers(selected_group_display);  //buscamos en postgis los grupos de capas de esa tema
                                                    //Añadimos un store con el resultado de esa busqueda

                                                    var singlelayersstore = Ext.create('Ext.data.Store', {
                                                        model: 'capasmodel',
                                                        data: single_layer
                                                    });

                                                    Ext.getCmp('selectlayer_display').bindStore(singlelayersstore);
                                                    Ext.getCmp('selectlayer_display').setValue(singlelayersstore.getAt(0));
                                                    selected_layer_display = null;

                                                    if (selected_group_display == "Select Group") {
                                                        selected_group_display = null;
                                                    }

                                                }
                                            }
                                        }, { //Selector de la capa de cada grupo

                                            xtype: 'combo',
                                            fieldLabel: 'Single Layer',
                                            id: 'selectlayer_display',
                                            displayField: 'name',
                                            width: 230,
                                            //store: singlelayerstore,
                                            queryMode: 'local',
                                            typeAhead: true,
                                            listeners: {
                                                select: function (combo, records) {

                                                    selected_layer_display = combo.getValue(); //sacamos el valor seleccionado

                                                    if (selected_layer_display == "Select layer") {
                                                        selected_layer_display = null;
                                                    }
                                           
                                                }
                                            }
                                        },{
                                            xtype: 'button',
                                            text: '<div style="color: Black">Display layer</div>',
                                            height: 25,
                                            margin: "15 2 4 2",
                                            //escuchador de eventos para cuando pulsamos el raton o pasamos por encima el raton
                                            listeners: {
                                                //evento on click
                                                click: function () {

                                                    displaylayers(favorable_options, null, olMap, styleFunction_favorable, geojsonPostgis);

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
                                                    
                                                    this.up('window').destroy(); //cerramos la ventana
                                                },
                                            }
                                        }
                                    ],
                                }).show();

                            },
                        }

                    }, {
                        xtype: 'tbspacer',
                        width: 85,
                        plugins: 'responsive',
                        responsiveConfig: {
                            'width < 800': {
                                hidden: true,
                            },
                            'width >= 800': {
                                hidden: false,
                            },
                        },

                    },

                    {
                        xtype: 'button',
                        text: '<div style="color: Black">Remove layer</div>',
                        height: 25,
                        //escuchador de eventos para cuando pulsamos el raton o pasamos por encima el raton
                        listeners: {
                            //evento on click
                            click: function () {

                            },
                        },

                    }
                ]
            }
        });

        overviewMap = Ext.create('GeoExt.component.OverviewMap', {
            parentMap: olMap,
            magnification: 12
        });

        ovMapPanel = Ext.create('Ext.panel.Panel', {
            //title: 'OverviewMap (default)',
            flex: 1,
            layout: 'fit',
            items: overviewMap
        });

        panelleft = Ext.create('Ext.form.Panel', {
            xtype: 'panel',
            region: 'west',
            title: 'Layers',
            //width: 300,
            split: true,
            collapsible: true,
            plugins: 'responsive',
            responsiveConfig: {
                'width < 700': {
                    width: 200,
                },
                'width >= 700': {
                    width: 280,
                },
            },
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            items: [
                treePanel,
                ovMapPanel
            ]
        });



        //PANEL LATERAL DERECHO


        //Variables para el select de capas de analisis

        selecttheme();   //funcion que hace consulta sobre postgis para obtener los nombres
        
        var themestore = Ext.create('Ext.data.Store', {
            model: 'capasmodel',
            data: themes
        });



        var singlelayerstore = Ext.create('Ext.data.Store', {
            model: 'capasmodel',
            data: single_layer
        });
        //fin obtencion variables para el combobox de temas de capas


        panelright = Ext.create('Ext.form.Panel', {
            //hidden : false,
            title: 'Spatial Analysis',
            //responsive design
            plugins: 'responsive',
            layout: 'fit',
            resizable: 'true',
            responsiveConfig: {
                landscape: {
                    region: 'east'
                },
                portrait: {
                    region: 'north'
                },
                'height < 400 && wide': {
                    hidden: true,
                },
                'height >= 400 && wide': {
                    hidden: false,
                },
            },
            collapsed: true,
            collapsible: true,

            items: [{

                xtype: "tabpanel",  //Grupo de pestañas
                id: "tabpanel",
                width: 350,
                plugins: 'responsive',
                responsiveConfig: {
                    'width < 700': {
                        width: 300,
                    },
                    'width >= 700': {
                        width: 350,
                    },
                },
                // height: 350,
                //autoHeight: true,
                autowidth: true,
                activeTab: 0,
                items: [{
                    title: 'Location seeker', //pestaña1
                    bodyPadding: 0,
                    //xtype: "tabpanel",
                    layout: 'accordion',
                    id: 'acordeon',
                    defaults: {
                        bodyStyle: 'padding:15px'
                    },
                    layoutConfig: {
                        titleCollapse: false,
                        animate: true,
                        activeOnTop: true,
                    },
                    items: [{
                        title: 'Favorable conditions',
                        id: 'favorable',
                        autoScroll: true,
                        items: [

                            { //Selector de la tematica para desplegar el grupo de capas
                            
                                xtype: 'combo',
                                fieldLabel: 'Layer Theme',
                                id: 'selecttheme',
                                displayField: 'name',
                                value: 'Select theme',
                                width: 265,
                                store: themestore,
                                queryMode: 'local',
                                typeAhead: true,
                                listeners: {
                                    select: function (combo, records) {

                                        selected_theme = combo.getValue(); //sacamos el valor seleccionado
                                        selectgroup(selected_theme);  //buscamos en postgis los grupos de capas de esa tema
                                        //Añadimos un store con el resultado de esa busqueda

                                        var groupstore = Ext.create('Ext.data.Store', {
                                            model: 'capasmodel',
                                            data: groups
                                        });

                                        Ext.getCmp('selectgroup').bindStore(groupstore);
                                        Ext.getCmp('selectgroup').setValue(groupstore.getAt(0));
                                        selected_layer = null;
                                        selected_group = null;

                                    }
                                }
                            }, { //Selector del grupo de capas

                                xtype: 'combo',
                                fieldLabel: 'Layer Group',
                                id: 'selectgroup',
                                displayField: 'name',
                                width: 265,
                                //store: groupstore,
                                queryMode: 'local',
                                typeAhead: true,
                                listeners: {
                                    select: function (combo, records) {

                                        selected_group = combo.getValue(); //sacamos el valor seleccionado
                                        selectlayers(selected_group);  //buscamos en postgis los grupos de capas de esa tema
                                        //Añadimos un store con el resultado de esa busqueda

                                        var singlelayersstore = Ext.create('Ext.data.Store', {
                                            model: 'capasmodel',
                                            data: single_layer
                                        });

                                        Ext.getCmp('selectlayer').bindStore(singlelayersstore);
                                        Ext.getCmp('selectlayer').setValue(singlelayersstore.getAt(0));
                                        selected_layer = null;

                                        if (selected_group == "Select Group") {
                                            selected_group = null;
                                        }

                                    }
                                }
                            }, { //Selector de la capa de cada grupo

                                xtype: 'combo',
                                fieldLabel: 'Single Layer',
                                id: 'selectlayer',
                                displayField: 'name',
                                width: 265,
                                //store: singlelayerstore,
                                queryMode: 'local',
                                typeAhead: true,
                                listeners: {
                                    select: function (combo, records) {

                                        selected_layer = combo.getValue(); //sacamos el valor seleccionado

                                        if (selected_layer == "Select layer") {  
                                            selected_layer = null;
                                        }
                                    }
                                }
                            }, {
                                xtype: 'textfield',
                                fieldLabel: 'Maximum influence distance',
                                id: 'buffer_fav_dist',
                                value: "100",
                                width: 210,
                            }, {
                                xtype: 'button',
                                text: '<div style="color: Black">Add Condition</div>',
                                height: 25,
                                margin: "15 2 4 2",
                                //escuchador de eventos para cuando pulsamos el raton o pasamos por encima el raton
                                listeners: {
                                    //evento on click
                                    click: function () {

                                        if (selected_theme != null) {

                                            var ex = olMap.getView().calculateExtent(olMap.getSize());
                                            ex = ol.proj.transformExtent(ex, ol.proj.get('EPSG:3857'), ol.proj.get('EPSG:4326'));

                                            favorable_options[0] = selected_theme;
                                            favorable_options[1] = selected_group;
                                            favorable_options[2] = selected_layer;
                                            favorable_options[3] = ex;
                                            favorable_options[4] = "favorable";
                                            favorable_options[5] = Ext.getCmp('buffer_fav_dist').getValue();

                                            master_favorable_options.push([selected_theme, selected_group, selected_layer, ex, "favorable", Ext.getCmp('buffer_fav_dist').getValue()]);

                                            var data = "[";
                                            for (i = 0; i < master_favorable_options.length; i++) {

                                                if (master_favorable_options[i][1] == null) {

                                                    data = data + "{ Condition: '" + master_favorable_options[i][0] + "', Distance: '" + master_favorable_options[i][5] + "' },"

                                                } else if (master_favorable_options[i][2] == null) {

                                                    if (master_favorable_options[i][1] == null) {
                                                        data = data + "{ Condition: '" + master_favorable_options[i][0] + "', Distance: '" + master_favorable_options[i][5] + "' },"
                                                    } else {
                                                        data = data + "{ Condition: '" + master_favorable_options[i][1] + "', Distance: '" + master_favorable_options[i][5] + "' },"
                                                    }
                                                } else if (master_favorable_options[i][2] != null) {
                                                    data = data + "{ Condition: '" + master_favorable_options[i][2] + "', Distance: '" + master_favorable_options[i][5] + "' },"
                                                }
                                            }

                                            data = data + "]";



                                            Ext.getCmp('favorable_grid').setVisible(true);
                                            storefavorables.loadData(eval(data), false);


                                        } else {

                                            Ext.MessageBox.show({
                                                title: 'Error',
                                                msg: 'You must select some layer',
                                                buttons: Ext.MessageBox.OK,
                                                icon: Ext.Msg.ERROR
                                            });

                                        }

                                    },
                                }


                            }, {
                                xtype: 'button',
                                text: '<div style="color: Black">Display Condition</div>',
                                height: 25,
                                margin: "15 2 4 2",
                                //escuchador de eventos para cuando pulsamos el raton o pasamos por encima el raton
                                listeners: {
                                    //evento on click
                                    click: function () {

                                        if (selected_theme != null) {

                                            //mostramos sobre el mapa la condiciones seleccionada por el usuario
                                            displaylayers(favorable_options, master_favorable_options, olMap, styleFunction_favorable, geojsonPostgis);

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

                                        } else {

                                            Ext.MessageBox.show({
                                                title: 'Error',
                                                msg: 'You must select some layer',
                                                buttons: Ext.MessageBox.OK,
                                                icon: Ext.Msg.ERROR
                                            });

                                        }
                                      

                                    },
                                }
                            }, {
                                //title: 'Favorable Conditions',
                                id: 'favorable_grid',
                                hidden: true,
                                autoScroll: true,
                                margin: "14 0 0 0",
                                items: [

                                    Ext.create('Ext.grid.Panel', {
                                        //title: 'Indicaciones',
                                        id: 'gridfavorable',
                                        autowidth: true,
                                        autoheight: true,
                                        bufferedRenderer: false,
                                        autoScroll:true,
                                        store: Ext.data.StoreManager.lookup('favorablesStore'),
                                        columns: [
                                        {
                                            text: 'Condition',
                                            dataIndex: 'Condition',
                                            sortable: false,
                                            flex: 67 / 100
                                        }, {
                                            text: 'Distance',
                                            dataIndex: 'Distance',
                                            sortable: false,
                                            flex: 33 / 100
                                        }],
                                        listeners: {
                                            afterlayout: function () {  //metodo para establecer un tamaño maximo
                                                var height = 155;
                                                if (this.getHeight() > height) {
                                                    this.setHeight(height);
                                                }
                                            }
                                        }

                                        //renderTo: Ext.getBody()
                                    })
                                ]
                            }, {
                                xtype: 'button',
                                text: '<div style="color: Black">Display Favorable Conditions</div>',
                                height: 25,
                                margin: "15 2 4 2",
                                //escuchador de eventos para cuando pulsamos el raton o pasamos por encima el raton
                                listeners: {
                                    //evento on click
                                    click: function () {

                                        if (selected_theme != null) {

                                            displaylayers_mutiples(favorable_options, master_favorable_options, olMap, styleFunction_favorable, geojsonPostgis);

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

                                        } else {

                                            Ext.MessageBox.show({
                                                title: 'Error',
                                                msg: 'You must select some layer',
                                                buttons: Ext.MessageBox.OK,
                                                icon: Ext.Msg.ERROR
                                            });

                                        }

                                    },
                                }
                            }

                        ]
                    }, {
                        title: 'Disfavorable conditions',
                        id: 'disfavorable',
                        autoScroll: true,
                        items: [

                            { //Selector de la tematica para desplegar el grupo de capas

                                xtype: 'combo',
                                fieldLabel: 'Layer Theme',
                                id: 'selecttheme2',
                                displayField: 'name',
                                value: 'Select theme',
                                width: 265,
                                store: themestore,
                                queryMode: 'local',
                                typeAhead: true,
                                listeners: {
                                    select: function (combo, records) {

                                        selected_theme2 = combo.getValue(); //sacamos el valor seleccionado
                                        selectgroup(selected_theme2);  //buscamos en postgis los grupos de capas de esa tema
                                        //Añadimos un store con el resultado de esa busqueda

                                        var groupstore = Ext.create('Ext.data.Store', {
                                            model: 'capasmodel',
                                            data: groups
                                        });

                                        Ext.getCmp('selectgroup2').bindStore(groupstore);
                                        Ext.getCmp('selectgroup2').setValue(groupstore.getAt(0));
                                        selected_layer2 = null;
                                        selected_group2 = null;

                                    }
                                }
                            }, { //Selector del grupo de capas

                                xtype: 'combo',
                                fieldLabel: 'Layer Group',
                                id: 'selectgroup2',
                                displayField: 'name',
                                width: 265,
                                //store: groupstore,
                                queryMode: 'local',
                                typeAhead: true,
                                listeners: {
                                    select: function (combo, records) {

                                        selected_group2 = combo.getValue(); //sacamos el valor seleccionado
                                        selectlayers(selected_group2);  //buscamos en postgis los grupos de capas de esa tema
                                        //Añadimos un store con el resultado de esa busqueda

                                        var singlelayersstore = Ext.create('Ext.data.Store', {
                                            model: 'capasmodel',
                                            data: single_layer
                                        });

                                        Ext.getCmp('selectlayer2').bindStore(singlelayersstore);
                                        Ext.getCmp('selectlayer2').setValue(singlelayersstore.getAt(0));
                                        selected_layer2 = null;

                                        if (selected_group2 == "Select Group") {
                                            selected_group2 = null;
                                        }

                                    }
                                }
                            }, { //Selector de la capa de cada grupo

                                xtype: 'combo',
                                fieldLabel: 'Single Layer',
                                id: 'selectlayer2',
                                displayField: 'name',
                                width: 265,
                                //store: singlelayerstore,
                                queryMode: 'local',
                                typeAhead: true,
                                listeners: {
                                    select: function (combo, records) {

                                        selected_layer2 = combo.getValue(); //sacamos el valor seleccionado

                                        if (selected_layer2 == "Select layer") {
                                            selected_layer2 = null;
                                        }
                                    }
                                }
                            }, {
                                xtype: 'textfield',
                                fieldLabel: 'Maximum influence distance',
                                id: 'buffer_disfav_dist',
                                value: "100",
                                width: 210,
                            }, {
                                xtype: 'button',
                                text: '<div style="color: Black">Add Condition</div>',
                                height: 25,
                                margin: "15 2 4 2",
                                //escuchador de eventos para cuando pulsamos el raton o pasamos por encima el raton
                                listeners: {
                                    //evento on click
                                    click: function () {

                                        if (selected_theme2 != null) {

                                            var ex = olMap.getView().calculateExtent(olMap.getSize());
                                            ex = ol.proj.transformExtent(ex, ol.proj.get('EPSG:3857'), ol.proj.get('EPSG:4326'));

                                            disfavorable_options[0] = selected_theme2;
                                            disfavorable_options[1] = selected_group2;
                                            disfavorable_options[2] = selected_layer2;
                                            disfavorable_options[3] = ex;
                                            disfavorable_options[4] = "disfavorable";
                                            disfavorable_options[5] = Ext.getCmp('buffer_disfav_dist').getValue();

                                            master_disfavorable_options.push([selected_theme2, selected_group2, selected_layer2, ex, "disfavorable", Ext.getCmp('buffer_disfav_dist').getValue()]);

                                            var data = "[";
                                            for (i = 0; i < master_disfavorable_options.length; i++) {

                                                if (master_disfavorable_options[i][1] == null) {

                                                    data = data + "{ Condition: '" + master_disfavorable_options[i][0] + "', Distance: '" + master_disfavorable_options[i][5] + "' },"

                                                } else if (master_disfavorable_options[i][2] == null) {

                                                    if (master_disfavorable_options[i][1] == null) {
                                                        data = data + "{ Condition: '" + master_disfavorable_options[i][0] + "', Distance: '" + master_disfavorable_options[i][5] + "' },"
                                                    } else {
                                                        data = data + "{ Condition: '" + master_disfavorable_options[i][1] + "', Distance: '" + master_disfavorable_options[i][5] + "' },"
                                                    }
                                                } else if (master_disfavorable_options[i][2] != null) {
                                                    data = data + "{ Condition: '" + master_disfavorable_options[i][2] + "', Distance: '" + master_disfavorable_options[i][5] + "' },"
                                                }
                                            }

                                            data = data + "]";



                                            Ext.getCmp('disfavorable_grid').setVisible(true);
                                            storedisfavorables.loadData(eval(data), false);


                                        } else {

                                            Ext.MessageBox.show({
                                                title: 'Error',
                                                msg: 'You must select some layer',
                                                buttons: Ext.MessageBox.OK,
                                                icon: Ext.Msg.ERROR
                                            });

                                        }

                                    },
                                }


                            }, {
                                xtype: 'button',
                                text: '<div style="color: Black">Display Condition</div>',
                                height: 25,
                                margin: "15 2 4 2",
                                //escuchador de eventos para cuando pulsamos el raton o pasamos por encima el raton
                                listeners: {
                                    //evento on click
                                    click: function () {

                                        if (selected_theme2 != null) {

                                            //mostramos sobre el mapa la condiciones seleccionada por el usuario
                                            displaylayers2(disfavorable_options, master_disfavorable_options, olMap, styleFunction_disfavorable, geojsonPostgis);

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

                                        } else {

                                            Ext.MessageBox.show({
                                                title: 'Error',
                                                msg: 'You must select some layer',
                                                buttons: Ext.MessageBox.OK,
                                                icon: Ext.Msg.ERROR
                                            });

                                        }


                                    },
                                }
                            }, {
                                //title: 'Favorable Conditions',
                                id: 'disfavorable_grid',
                                hidden: true,
                                autoScroll: true,
                                margin: "14 0 0 0",
                                items: [

                                    Ext.create('Ext.grid.Panel', {
                                        //title: 'Indicaciones',
                                        id: 'griddisfavorable',
                                        autowidth: true,
                                        autoheight: true,
                                        bufferedRenderer: false,
                                        autoScroll: true,
                                        store: Ext.data.StoreManager.lookup('disfavorablesStore'),
                                        columns: [
                                            {
                                                text: 'Condition',
                                                dataIndex: 'Condition',
                                                sortable: false,
                                                flex: 67 / 100
                                            }, {
                                                text: 'Distance',
                                                dataIndex: 'Distance',
                                                sortable: false,
                                                flex: 33 / 100
                                            }],
                                        listeners: {
                                            afterlayout: function () {  //metodo para establecer un tamaño maximo
                                                var height = 155;
                                                if (this.getHeight() > height) {
                                                    this.setHeight(height);
                                                }
                                            }
                                        }

                                        //renderTo: Ext.getBody()
                                    })
                                ]
                            }, {
                                xtype: 'button',
                                text: '<div style="color: Black">Display Disfavorable Conditions</div>',
                                height: 25,
                                margin: "15 2 4 2",
                                //escuchador de eventos para cuando pulsamos el raton o pasamos por encima el raton
                                listeners: {
                                    //evento on click
                                    click: function () {

                                        if (selected_theme2 != null) {

                                            displaylayers_mutiples(disfavorable_options, master_disfavorable_options, olMap, styleFunction_disfavorable, geojsonPostgis);

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

                                        } else {

                                            Ext.MessageBox.show({
                                                title: 'Error',
                                                msg: 'You must select some layer',
                                                buttons: Ext.MessageBox.OK,
                                                icon: Ext.Msg.ERROR
                                            });

                                        }

                                    },
                                }
                            }

                        ]
                    }
                    ],
                    fbar: {
                        //style: { background:'#08088A', marginTop: '0px' , borderWidth:'0px'},
                        items: [
                            {
                            //boton para el ejecutar el calculo de ruta
                            xtype: 'button',
                            text: '<div style="color: Black">Calculate location</div>',
                            height: 25,
                            //escuchador de eventos para cuando pulsamos el raton o pasamos por encima el raton
                            listeners: {
                                //evento on click
                                click: function () {

                                    if (master_favorable_options.length == 0 & master_disfavorable_options.length == 0)
                                    {
                                                Ext.MessageBox.show({
                                                    title: 'Error',
                                                    msg: 'You must select some condition',
                                                    buttons: Ext.MessageBox.OK,
                                                    icon: Ext.Msg.ERROR
                                                });
                                    } else {

                                        calculate_bestplace(master_favorable_options, master_disfavorable_options, olMap, styleFunction_zones, geojsonPostgis);

                                    }

                                },
                            }

                            },

                            {
                                xtype: 'button',
                                text: '<div style="color: Black">TEST POSTGIS</div>',
                                height: 25,
                                //escuchador de eventos para cuando pulsamos el raton o pasamos por encima el raton
                                listeners: {
                                    //evento on click
                                    click: function () {
                                        Ext.Ajax.request({
                                            url: '/Home/GetLayout',
                                            params: "",
                                            headers: { 'Content-Type': 'application/json; charset=utf-8' },
                                            method: "GET",
                                            success: function (response) {
                                                Ext.Msg.alert('Javi, ah\u00ed tienes tu json, ahora vas y lo pintas!', response.responseText, Ext.emptyFn)
                                            },
                                            failure: function (response) {
                                                Ext.Msg.alert('Algo ha ido mal', response, Ext.emptyFn)
                                            }
                                        });
                                    },
                                },

                            }
                        ]
                    }

                }, {
                    title: 'Routing', //pestaña2
                    bodyPadding: 0,
                    //xtype: "tabpanel",
                    layout: 'accordion',
                    id: 'acordeon2',
                    defaults: {
                        bodyStyle: 'padding:15px'
                    },
                    layoutConfig: {
                        titleCollapse: false,
                        animate: true,
                        activeOnTop: true,
                    },
                    items: [{
                        title: 'By direction',
                        id: 'pordireccion',
                        items: [

                        ]
                    }, {
                        title: 'By coordinates',
                        id: 'porcoordenadas',
                        items: [

                        ]
                    }
                    ],
                    fbar: {
                        //style: { background:'#08088A', marginTop: '0px' , borderWidth:'0px'},
                        items: [{
                            xtype: 'label',
                            id: 'distancia',
                            text: '',
                        },


                        { //boton para el ejecutar el calculo de ruta
                            xtype: 'button',
                            text: '<div style="color: Black">Calcular ruta</div>',
                            height: 25,
                            //escuchador de eventos para cuando pulsamos el raton o pasamos por encima el raton
                            listeners: {
                                //evento on click
                                click: function () {

                                },
                            }

                        }
                        ]
                    }




                }]
            }]
        });




        //MENU PRINCIPAL (Lo ponemos vacioa para que el mapa no tape el menu bootstrap)
        menu = Ext.create('Ext.form.Panel', {
            id: 'menu',
            hidden: false,
            /*bodyStyle:{
                 background:'#08088A'
               },  */
            height: 50,
            //responsive design
            plugins: 'responsive',
            responsiveConfig: {
                landscape: {
                    region: 'north'
                },
                portrait: {
                    region: 'north'
                }
            },
            tbar: {
                style: {
                    background: '#08088A',
                    marginTop: '0px',
                    borderWidth: '0px'
                },
            }

        });



        //ELEMENTO PRINCIPAL EXTJS
        Ext.create('Ext.Viewport', {
            layout: 'border',
            items: [
                menu,
                mapPanel,
                panelleft,
                panelright
            ]
        });
    }
});
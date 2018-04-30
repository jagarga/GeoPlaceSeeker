using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using Npgsql;
using Microsoft.ApplicationInsights.Extensibility;

namespace WebApplication2.Controllers
{
    //[Authorize]
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            TelemetryConfiguration.Active.DisableTelemetry = true;  //para desactivar la telemetria mientras debugeamos
            return View();
        }

        public ActionResult GetLayout()
        {
            // Connect to a PostgreSQL database
            //NpgsqlConnection conn = new NpgsqlConnection("Server=localhost;User Id=postgres; Password=postgres;Database=OSM_Spain;");
            NpgsqlConnection conn = new NpgsqlConnection("Server=osmspain.creaughtoiaa.us-east-2.rds.amazonaws.com; User Id=Jagarga; Password=Moratillo1; Database=OSMSpainDB;");
            conn.Open();

            // Define a query returning a single row result set
            string query = "SELECT ST_AsText(geom) FROM public.osm_buildings_a_free_1 limit 5";
            NpgsqlCommand command = new NpgsqlCommand(query, conn);

            // Execute the query and obtain the value of the first column of the first row
            NpgsqlDataReader dr = command.ExecuteReader();
            object geom = null;

            while (dr.Read())
            {
                geom = dr[0];
            }

            conn.Close();

            return Json(new { geom = geom ?? string.Empty }, JsonRequestBehavior.AllowGet);

        }

        public ActionResult GetThemes()
        {
            // Connect to a PostgreSQL database
            //NpgsqlConnection conn = new NpgsqlConnection("Server=localhost;User Id=postgres; Password=postgres;Database=OSM_Spain;");
            NpgsqlConnection conn = new NpgsqlConnection("Server=osmspain.creaughtoiaa.us-east-2.rds.amazonaws.com; User Id=Jagarga; Password=Moratillo1; Database=OSMSpainDB;");
            conn.Open();

            // Define a query returning a single row result set
            string query = "SELECT distinct layer FROM public.layer_names";
            NpgsqlCommand command = new NpgsqlCommand(query, conn);

            // Execute the query and obtain the value of the first column of the first row
            NpgsqlDataReader dr = command.ExecuteReader();
            var theme = new List<string>();
            //object theme = null;

            while (dr.Read())
                {
                theme.Add(dr[0].ToString());
                }

            conn.Close();

            return Json(new { name = theme.ToList() }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult GetGroups(string theme)
        {
            // Connect to a PostgreSQL database
            //NpgsqlConnection conn = new NpgsqlConnection("Server=localhost;User Id=postgres; Password=postgres;Database=OSM_Spain;");
            NpgsqlConnection conn = new NpgsqlConnection("Server=osmspain.creaughtoiaa.us-east-2.rds.amazonaws.com; User Id=Jagarga; Password=Moratillo1; Database=OSMSpainDB;");
            conn.Open();

            // Define a query returning a single row result set
            string query = "SELECT distinct layer_group FROM public.layer_names where layer ='" +  theme + "'";
            NpgsqlCommand command = new NpgsqlCommand(query, conn);

            // Execute the query and obtain the value of the first column of the first row
            NpgsqlDataReader dr = command.ExecuteReader();
            var group = new List<string>();
            //object theme = null;

            while (dr.Read())
            {
                group.Add(dr[0].ToString());
            }

            conn.Close();

            return Json(new { name = group.ToList() }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult GetLayers(string theme)
        {
            // Connect to a PostgreSQL database
            //NpgsqlConnection conn = new NpgsqlConnection("Server=localhost;User Id=postgres; Password=postgres;Database=OSM_Spain;");
            NpgsqlConnection conn = new NpgsqlConnection("Server=osmspain.creaughtoiaa.us-east-2.rds.amazonaws.com; User Id=Jagarga; Password=Moratillo1; Database=OSMSpainDB;");
            conn.Open();

            // Define a query returning a single row result set
            string query = "SELECT distinct fclass FROM public.layer_names where layer_group ='" + theme + "'";
            NpgsqlCommand command = new NpgsqlCommand(query, conn);

            // Execute the query and obtain the value of the first column of the first row
            NpgsqlDataReader dr = command.ExecuteReader();
            var group = new List<string>();
            //object theme = null;

            while (dr.Read())
            {
                group.Add(dr[0].ToString());
            }

            conn.Close();

            return Json(new { name = group.ToList() }, JsonRequestBehavior.AllowGet);
        }


        public ActionResult DisplayLayers(string theme, string layergroup, string layer, string ext, string type, string buffer, int nextRegister)
        {
            // Connect to a PostgreSQL database
            //NpgsqlConnection conn = new NpgsqlConnection("Server=localhost;User Id=postgres; Password=postgres;Database=OSM_Spain;");
            NpgsqlConnection conn = new NpgsqlConnection("Server=osmspain.creaughtoiaa.us-east-2.rds.amazonaws.com; User Id=Jagarga; Password=Moratillo1; Database=OSMSpainDB;");
            conn.Open();
            string query = " ";

            if (type == "DisplayLayers"){
        
            // Define a query returning a single row result set
            if (layergroup == "null")
            {
                query = "SELECT ST_AsGeoJSON(geom) FROM(SELECT * FROM public." + theme + " WHERE public." + theme + ".geom && ST_MakeEnvelope(" + ext + ", 4326)) as data";
            }
            else if (layer == "null")
            {
                query = "SELECT ST_AsGeoJSON(geom) FROM(SELECT * FROM public." + theme + " WHERE public." + theme + ".geom && ST_MakeEnvelope(" + ext + ", 4326) AND code::text LIKE (SELECT layer_group_code from public.layer_names where layer_group='" + layergroup + "' limit 1)||'%') as layer";
            }
            else
            {
                query = "SELECT ST_AsGeoJSON(geom) FROM(SELECT * FROM public." + theme + " WHERE public." + theme + ".geom && ST_MakeEnvelope(" + ext + ", 4326) AND fclass = '" + layer + "') as layer";
            }
            }else if (type == "favorable" || type == "disfavorable")
            {
                if (layergroup == "null")
                {
                    query = "SELECT ST_AsGeoJSON(ST_Transform(ST_SetSRID(ST_Buffer,3857),4326)) FROM(SELECT ST_Buffer(ST_Transform(ST_SetSRID(geom,4326),3857), " + buffer + ") FROM(SELECT * FROM public." + theme + " WHERE public." + theme + ".geom && ST_MakeEnvelope(" + ext + ", 4326)) as data) as buffer";
                }
                else if (layer == "null")
                {
                    query = "SELECT ST_AsGeoJSON(ST_Transform(ST_SetSRID(ST_Buffer,3857),4326)) FROM(SELECT ST_Buffer(ST_Transform(ST_SetSRID(geom,4326),3857), " + buffer + ") FROM(SELECT * FROM public." + theme + " WHERE public." + theme + ".geom && ST_MakeEnvelope(" + ext + ", 4326) AND code::text LIKE (SELECT layer_group_code from public.layer_names where layer_group='" + layergroup + "' limit 1)||'%') as layer) as buffer";
                }
                else
                {
                    query = "SELECT ST_AsGeoJSON(ST_Transform(ST_SetSRID(ST_Buffer,3857),4326)) FROM(SELECT ST_Buffer(ST_Transform(ST_SetSRID(geom,4326),3857), " + buffer + ") FROM(SELECT * FROM public." + theme + " WHERE public." + theme + ".geom && ST_MakeEnvelope(" + ext + ", 4326) AND fclass = '" + layer + "') as layer) as buffer";
                }
            }


            query += " LIMIT 10000 OFFSET " + nextRegister;
            NpgsqlCommand command = new NpgsqlCommand(query, conn);

            // Execute the query and obtain the value of the first column of the first row
            NpgsqlDataReader dr = command.ExecuteReader();
            var group = new List<string>();
            //object theme = null;

            while (dr.Read())
            {
                group.Add(dr[0].ToString());
            }
            
            conn.Close();

            var jsonResult = Json(new { name = group.ToList() }, JsonRequestBehavior.AllowGet);
            jsonResult.MaxJsonLength = int.MaxValue;
            return jsonResult;
            //return Json(new { name = group.ToList() }, JsonRequestBehavior.AllowGet);
        }


        public ActionResult CalculateZone(string query, int nextRegister)
        {
            // Connect to a PostgreSQL database
            //NpgsqlConnection conn = new NpgsqlConnection("Server=localhost;User Id=postgres; Password=postgres;Database=OSM_Spain;");
            NpgsqlConnection conn = new NpgsqlConnection("Server=osmspain.creaughtoiaa.us-east-2.rds.amazonaws.com; User Id=Jagarga; Password=Moratillo1; Database=OSMSpainDB;");
            conn.Open();

            query += " LIMIT 10000 OFFSET " + nextRegister;
            NpgsqlCommand command = new NpgsqlCommand(query, conn);

            // Execute the query and obtain the value of the first column of the first row
            NpgsqlDataReader dr = command.ExecuteReader();
            var group = new List<string>();
            //object theme = null;

            while (dr.Read())
            {
                group.Add(dr[0].ToString());
            }

            conn.Close();

            var jsonResult = Json(new { name = group.ToList() }, JsonRequestBehavior.AllowGet);
            jsonResult.MaxJsonLength = int.MaxValue;
            return jsonResult;
            //return Json(new { name = group.ToList() }, JsonRequestBehavior.AllowGet);
        }

    }
}

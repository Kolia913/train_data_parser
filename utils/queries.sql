-- Useful queries used during the development process:

SELECT json_build_object(
        'id', p.id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'birth_date', p.birth_date,
        'fare', json_build_object(
                'id', f.id,
                'title', f.title,
                'discount', f.discount / 100
                ),
        'user', json_build_object(
                'id', u.id,
                'name', u.name,
                'email', u.email,
                'phone', u.phone
                )
       ) as "passenger" FROM passenger p JOIN "user" u ON p.user_id = u.id
        JOIN fare f ON p.fare_id = f.id;

SELECT s.id, s.distance, ar_s.name as arival_name, d_s.name as dep_name FROM segment s
    JOIN station ar_s ON s.a_station_id = ar_s.id
    JOIN station d_s ON s.d_station_id = d_s.id;

SELECT w.number, w.type, t.number as trin_number, t.type as train_type, t.class as train_class
FROM wagon w JOIN train t ON w.train_id = t.id;

SELECT s.id,
       depart_st.id as dep_st_id, depart_st.lon as dep_st_lon, depart_st.lat as dep_st_lat,
       arriv_st.id as arr_st_id, arriv_st.lon as arr_st_lon, arriv_st.lat as arr_st_lat  FROM segment s
    JOIN station depart_st ON s.d_station_id = depart_st.id
    JOIN station arriv_st ON s.a_station_id = arriv_st.id;

SELECT DISTINCT type FROM wagon;
SELECT DISTINCT type FROM train;

SELECT json_agg(DISTINCT type) AS types
FROM wagon;

SELECT DISTINCT wagon_id FROM route_part ORDER BY wagon_id;

SELECT COUNT(*) FROM wagon;

BEGIN TRANSACTION;
DELETE FROM wagons_services ws WHERE ws.wagon_id  NOT IN (SELECT DISTINCT wagon_id FROM route_part);
DELETE FROM wagon w WHERE w.id NOT IN (SELECT DISTINCT wagon_id FROM route_part);
COMMIT TRANSACTION;

SELECT COUNT(*) FROM wagon;

SELECT rp.wagon_id, json_agg(json_build_object('id', rp.id, 'price', rp.price, 'order', rp."order")) 
as route_parts FROM route_part rp GROUP BY wagon_id;

SELECT p.id, f.discount FROM passenger p JOIN fare f ON p.fare_id = f.id;
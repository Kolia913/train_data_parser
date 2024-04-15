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

BEGIN TRANSACTION;
DELETE FROM wagons_services ws WHERE ws.wagon_id  NOT IN (SELECT DISTINCT wagon_id FROM route_part);
DELETE FROM wagon w WHERE w.id NOT IN (SELECT DISTINCT wagon_id FROM route_part);
COMMIT TRANSACTION;

SELECT COUNT(*) FROM wagon;
SELECT COUNT(*) FROM seat;

SELECT rp.wagon_id, json_agg(json_build_object('id', rp.id, 'price', rp.price, 'order', rp."order")) 
as route_parts FROM route_part rp GROUP BY wagon_id;

SELECT p.id, f.discount, f.id as fare_id FROM passenger p JOIN fare f ON p.fare_id = f.id;

SELECT s.id as seat_id, rp.wagon_id, json_agg(json_build_object('id', rp.id, 'price', rp.price, 'order', rp."order"))
as route_parts FROM seat s JOIN wagon w ON s.wagon_id = w.id JOIN route_part rp ON rp.wagon_id = w.id GROUP BY s.id, rp.wagon_id;

SELECT tr.ticket_id, json_agg(tr.route_part_id) as route_part_ids
FROM ticket_route tr GROUP BY tr.ticket_id;

SELECT '2011-01-01 00:00:00'::TIMESTAMP;

SELECT t.id, t.usage_timestamp, (array_agg(a_s.id))[1] as available_service
FROM ticket t JOIN seat s ON s.id = t.seat_id
    JOIN wagon w ON s.wagon_id = w.id
    JOIN wagons_services ws ON ws.wagon_id = w.id
    JOIN additional_service a_s ON ws.additional_service_id = a_s.id
GROUP BY t.id;

SELECT t.id, t.usage_timestamp, (array_agg(json_build_object('id', a_s.id, 'price', a_s.price)))[1]
    as available_service
FROM ticket t JOIN seat s ON s.id = t.seat_id
    JOIN wagon w ON s.wagon_id = w.id
    JOIN wagons_services ws ON ws.wagon_id = w.id
    JOIN additional_service a_s ON ws.additional_service_id = a_s.id
GROUP BY t.id;
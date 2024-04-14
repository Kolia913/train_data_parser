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
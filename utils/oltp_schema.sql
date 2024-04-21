create table if not exists fare
(
    id       serial
        constraint "PK_f2249d0689450674b6a1d50ab1c"
            primary key,
    title    varchar(255)     not null,
    discount double precision not null
);

create table if not exists train
(
    id     serial
        constraint "PK_0590a6e4276dfef1c8ba49f1c08"
            primary key,
    number varchar(100) not null,
    type   varchar(255) not null,
    class  varchar(255) not null
);

create table if not exists station
(
    id   serial
        constraint "PK_cad1b3e7182ef8df1057b82f6aa"
            primary key,
    name varchar(255)     not null,
    city varchar(255)     not null,
    lon  double precision not null,
    lat  double precision not null
);

create table if not exists segment
(
    id           serial
        constraint "PK_d648ac58d8e0532689dfb8ad7ef"
            primary key,
    distance     double precision not null,
    d_station_id integer
        constraint "FK_5e368bc16ece7fe87041106d778"
            references station,
    a_station_id integer
        constraint "FK_4ba1293aad1c9e169ee3a6dd36f"
            references station
);

create table if not exists additional_service
(
    id    serial
        constraint "PK_e06cd186fc8527c947ca73fc209"
            primary key,
    name  varchar(255)     not null,
    price double precision not null
);

create table if not exists wagon
(
    id           serial
        constraint "PK_cc30238df566d12de60750a1dc3"
            primary key,
    number       varchar(100)     not null,
    type         varchar(255)     not null,
    rental_price double precision not null,
    train_id     integer
        constraint "FK_5098f1d2c0d94a0453710545d3b"
            references train
            on delete cascade
);

create table if not exists route_part
(
    id                     serial
        constraint "PK_4fccb4af8d7d9f21ba455e50a84"
            primary key,
    departure_time_minutes integer          not null,
    arrival_time_minutes   integer          not null,
    "order"                integer          not null,
    price                  double precision not null,
    wagon_id               integer
        constraint "FK_e9cb66aa57396f76bf867307561"
            references wagon
            on delete cascade,
    segment_id             integer
        constraint "FK_1699fccceca429649849fa64a8a"
            references segment
            on delete cascade
);

create table if not exists seat
(
    id       serial
        constraint "PK_4e72ae40c3fbd7711ccb380ac17"
            primary key,
    number   varchar(100) not null,
    type     varchar(255) not null,
    wagon_id integer
        constraint "FK_88efbaa1645b36723e0c8ed8dc0"
            references wagon
            on delete cascade
);

create table if not exists "user"
(
    id       serial
        constraint "PK_cace4a159ff9f2512dd42373760"
            primary key,
    phone    varchar(24)  not null,
    email    varchar(255) not null,
    password varchar(500) not null,
    name     varchar(100) not null
);

create table if not exists passenger
(
    id         serial
        constraint "PK_50e940dd2c126adc20205e83fac"
            primary key,
    first_name varchar(100) not null,
    last_name  varchar(100) not null,
    birth_date date         not null,
    fare_id    integer
        constraint "FK_55b1168a7624b1001f2100e0dba"
            references fare
            on delete set null,
    user_id    integer
        constraint "FK_e9fcf06970cda7662c073a05e59"
            references "user"
            on delete cascade
);

create table if not exists ticket
(
    id                  serial
        constraint "PK_d9a0835407701eb86f874474b7c"
            primary key,
    price               double precision not null,
    price_with_discount double precision not null,
    purchase_timestamp  timestamp        not null,
    usage_timestamp     timestamp,
    passenger_id        integer
        constraint "FK_87e2413e9ac12456adabac08457"
            references passenger
            on delete cascade,
    seat_id             integer
        constraint "FK_bc6a9497287b609dbd2806850c7"
            references seat
            on delete set null,
    fare_id             integer
        constraint "FK_7b3c317221669f725221ad02ae6"
            references fare
            on delete set null
);

create table if not exists tickets_services
(
    ticket_id             integer                  not null
        constraint "FK_18ae95e5b4ae5b3d807e684a1b7"
            references ticket
            on delete cascade,
    additional_service_id integer                  not null
        constraint "FK_ae4a64aadd56320be04d643a4b9"
            references additional_service
            on delete cascade,
    price_with_discount   double precision         not null,
    sale_timestamp        timestamp with time zone not null,
    constraint "PK_b28b2b2e25d1f718a55e920e298"
        primary key (ticket_id, additional_service_id)
);

create table if not exists returned_ticket
(
    id            serial
        constraint "PK_ad1089dc0181d614230ce6437f7"
            primary key,
    refund_amount double precision not null,
    return_date   date             not null,
    ticket_id     integer
        constraint "REL_4cec25611e06cac96bde2b07bb"
            unique
        constraint "FK_4cec25611e06cac96bde2b07bb3"
            references ticket
            on delete cascade
);

create table if not exists wagons_services
(
    wagon_id              integer not null
        constraint "FK_61827612fd9d65fcfc603e6b005"
            references wagon
            on update cascade on delete cascade,
    additional_service_id integer not null
        constraint "FK_75f12ef1fdfb8e5f507e1ad9385"
            references additional_service
            on update cascade on delete cascade,
    constraint "PK_cd90ab306a13ffd7683fec212fc"
        primary key (wagon_id, additional_service_id)
);

create index if not exists "IDX_61827612fd9d65fcfc603e6b00"
    on wagons_services (wagon_id);

create index if not exists "IDX_75f12ef1fdfb8e5f507e1ad938"
    on wagons_services (additional_service_id);

create table if not exists ticket_route
(
    ticket_id     integer not null
        constraint "FK_297b50790120b4236579bb1d1bd"
            references ticket
            on update cascade on delete set null,
    route_part_id integer not null
        constraint "FK_e7b698147ac307a9dd3be95b383"
            references route_part
            on update cascade on delete cascade,
    constraint "PK_47037c5c9f6d7af46f6f70be92e"
        primary key (ticket_id, route_part_id)
);

create index if not exists "IDX_297b50790120b4236579bb1d1b"
    on ticket_route (ticket_id);

create index if not exists "IDX_e7b698147ac307a9dd3be95b38"
    on ticket_route (route_part_id);



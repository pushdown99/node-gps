CREATE USER 'sqladmin'@'localhost' IDENTIFIED BY 'admin'; GRANT ALL PRIVILEGES ON *.* TO 'sqladmin'@'localhost' WITH GRANT OPTION; FLUSH PRIVILEGES;
CREATE DATABASE pdr CHARACTER SET utf8 COLLATE utf8_general_ci;
USE pdr;
DROP TABLE sensors;
CREATE TABLE IF NOT EXISTS sensors (
  id             int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  dev            varchar(64) NOT NULL,
  ax             float,
  ay             float,
  az             float,
  ak             float,
  gx             float,
  gy             float,
  gz             float,
  heading        float,
  pitch          float,
  roll           float,
  ts             timestamp NOT NULL   
);

DROP TABLE mobile;
CREATE TABLE IF NOT EXISTS mobile (
  id             int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  alpha          float,
  beta           float,
  gamma          float,
  x              float,
  y              float,
  z              float,
  lat            float,
  lng            float,
  ts             timestamp NOT NULL
);

DROP TABLE gps;
CREATE TABLE IF NOT EXISTS gps (
  id             int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  lat            float,
  lng            float,
  x              float,
  y              float,
  z              float,
  k              float,
  ts             timestamp NOT NULL
);


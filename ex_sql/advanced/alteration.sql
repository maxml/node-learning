-- Adding columns
ALTER TABLE Customer ADD
(
    Email char(50), 
    Telephone char(100)
);

-- Modifying columns
ALTER TABLE Customer 
MODIFY Address char(100);

-- drop column
ALTER TABLE Customer DROP Birth_Date;

-- renaming
ALTER TABLE Customer CHANGE Address Addr char(50);

-- add index
ALTER TABLE Customer ADD INDEX IDX_COUNTRY (Country);

-- drop index
ALTER TABLE Customer DROP INDEX IDX_COUNTRY;

-- add constraint 
ALTER TABLE Customer ADD CONSTRAINT Con_First UNIQUE(Address);

-- Drop constraint
ALTER TABLE Customer DROP INDEX Con_First;
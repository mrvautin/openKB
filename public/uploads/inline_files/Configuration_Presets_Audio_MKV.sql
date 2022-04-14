-- ---------------------------------------------------
-- Configuration des AUDIOS du MKV  (AAC)
-- Dans cette configuration, on active : AAC (4 codings)
-- ---------------------------------------------------
use MAM

/*
 select * from AUDIO_DEFAULT where CO_CONTAINERFORMAT=10030
 select * from AUDIO_CODING
 select * from AUDIO_CHANNEL_COMBINATIONS
 select * from AUDIO_DEFAULT_TRACK where CO_CONTAINERFORMAT=10030 order by 1,2
 select * from AUDIO_CODING_COMBINATION where CO_DATAFORMAT=10003
*/


-- -------------------------------------------------------
-- Nettoyage
-- -------------------------------------------------------
-- select * from AUDIO_DEFAULT_TRACK where CO_CONTAINERFORMAT=10030 
-- delete from AUDIO_DEFAULT_TRACK where CO_CONTAINERFORMAT=10030
-- select * from AUDIO_DEFAULT where CO_CONTAINERFORMAT=10030
-- delete from AUDIO_DEFAULT where CO_CONTAINERFORMAT=10030


-- -------------------------------------------------------
-- Autoriser les Combinaisons (8 pistes) pour le AAC
-- -------------------------------------------------------
select * from AUDIO_CODING_COMBINATION where CO_DATAFORMAT=10003 order by 1
-- 8 Mono
insert AUDIO_CODING_COMBINATION (CO_AUDIOCODING, CO_AUDIOCOMBINATION, CO_AUDIOTYPE, CO_DATAFORMAT) values (1,1,1,10003)
insert AUDIO_CODING_COMBINATION (CO_AUDIOCODING, CO_AUDIOCOMBINATION, CO_AUDIOTYPE, CO_DATAFORMAT) values (1,2,2,10003)
insert AUDIO_CODING_COMBINATION (CO_AUDIOCODING, CO_AUDIOCOMBINATION, CO_AUDIOTYPE, CO_DATAFORMAT) values (1,3,1,10003)
insert AUDIO_CODING_COMBINATION (CO_AUDIOCODING, CO_AUDIOCOMBINATION, CO_AUDIOTYPE, CO_DATAFORMAT) values (1,4,2,10003)
insert AUDIO_CODING_COMBINATION (CO_AUDIOCODING, CO_AUDIOCOMBINATION, CO_AUDIOTYPE, CO_DATAFORMAT) values (1,5,1,10003)
insert AUDIO_CODING_COMBINATION (CO_AUDIOCODING, CO_AUDIOCOMBINATION, CO_AUDIOTYPE, CO_DATAFORMAT) values (1,6,2,10003)
insert AUDIO_CODING_COMBINATION (CO_AUDIOCODING, CO_AUDIOCOMBINATION, CO_AUDIOTYPE, CO_DATAFORMAT) values (1,7,1,10003)
insert AUDIO_CODING_COMBINATION (CO_AUDIOCODING, CO_AUDIOCOMBINATION, CO_AUDIOTYPE, CO_DATAFORMAT) values (1,8,2,10003)
-- 4 Stéréo
-- 3 dolby 5.1
insert AUDIO_CODING_COMBINATION (CO_AUDIOCODING, CO_AUDIOCOMBINATION, CO_AUDIOTYPE, CO_DATAFORMAT) values (5,29,9,10003)
insert AUDIO_CODING_COMBINATION (CO_AUDIOCODING, CO_AUDIOCOMBINATION, CO_AUDIOTYPE, CO_DATAFORMAT) values (5,30,9,10003)

begin tran

-- -----------------------------------------------------------------------------
-- ajout Mono AAC pour MKV
-- -----------------------------------------------------------------------------
insert AUDIO_DEFAULT (
	CO_CONTAINERFORMAT,
	CO_DATAFORMAT,
	NB_TRACK, LI_TRACKID, CO_LANGUAGE, NB_BITCODING, 	
	CO_AUDIOCODING, NB_BITRATE, CO_SAMPLEFREQ,
	CO_AUDIOCOMBINATION,
	ID_USERLABEL, CO_MEDIUMTYPE, CO_BITRATEMODE,
	LI_PRESETLABEL,
	LO_ISDEFAULT)
values (
	10030,          -- MKV
	10003,          -- AAC
	1, '1', 0, 24,  -- ID Track  (et label)
	1, 256000, 9,   -- 1=Mono  3=Stereo 6=DolbyE 5=5.1
	1,              -- 1="1"    17="1-2"      29="7-8"
	0, 2, 0,
	'Add Mono',
	0)

-- -----------------------------------------------------------------------------
-- ajout Stereo AAC pour MKV
-- -----------------------------------------------------------------------------
insert AUDIO_DEFAULT (
	CO_CONTAINERFORMAT,
	CO_DATAFORMAT,
	NB_TRACK, LI_TRACKID, CO_LANGUAGE, NB_BITCODING, 	
	CO_AUDIOCODING, NB_BITRATE, CO_SAMPLEFREQ,
	CO_AUDIOCOMBINATION,
	ID_USERLABEL, CO_MEDIUMTYPE, CO_BITRATEMODE,
	LI_PRESETLABEL,
	LO_ISDEFAULT)
values (
	10030,          -- MKV
	10003,          -- AAC
	2, '2', 0, 24,  -- ID Track  (et label)
	3, 256000, 9,   -- 1=Mono  3=Stereo 6=DolbyE 5=5.1
	17,             -- 1="1"    17="1-2"      19="7-8"
	0, 2, 0,
	'Add Stéréo',
	0)

-- -----------------------------------------------------------------------------
-- AJOUT AAC 5.1 pour MKV
-- -----------------------------------------------------------------------------
insert AUDIO_DEFAULT (
	CO_CONTAINERFORMAT,
	CO_DATAFORMAT,
	NB_TRACK, LI_TRACKID, CO_LANGUAGE, NB_BITCODING, 	
	CO_AUDIOCODING, NB_BITRATE, CO_SAMPLEFREQ,
	CO_AUDIOCOMBINATION,
	ID_USERLABEL, CO_MEDIUMTYPE, CO_BITRATEMODE,
	LI_PRESETLABEL,
	LO_ISDEFAULT)
values (
	10030,          -- MKV
	10003,          -- AAC
	3, '3', 0, 24,  -- ID Track (et label)
	5, 256000, 9,   -- 1=Mono  3=Stereo 6=DolbyE 5=5.1
	29,             -- 1="1"   17="1-2"  29="1-2-3-4-5-6"
	0, 2, 0,
	'Add 5.1',
	0)

-- -----------------------------------------------------------------------------
-- AJOUT DE-Audio pour MKV
-- -----------------------------------------------------------------------------
insert AUDIO_DEFAULT (
	CO_CONTAINERFORMAT,
	CO_DATAFORMAT,
	NB_TRACK, LI_TRACKID, CO_LANGUAGE, NB_BITCODING, 	
	CO_AUDIOCODING, NB_BITRATE, CO_SAMPLEFREQ,
	CO_AUDIOCOMBINATION,
	ID_USERLABEL, CO_MEDIUMTYPE, CO_BITRATEMODE,
	LI_PRESETLABEL,
	LO_ISDEFAULT)
values (
	10030,          -- MKV
	10003,          -- AAC
	4, '4', 0, 24,  -- ID et Label de Track
	6, 256000, 9,   -- 1=Mono 3=Stereo 6=DolbyE 5=5.1
	19,
	0, 2, 0,
	'Add Dolby-E',
	0)

rollback tran


-- -------------------------------------------------------
-- -------------------------------------------------------

begin tran
  -- DEFAULT 1 : On autorise les MONO (1) pour les AAC (10003) du MKV (10030)
  insert AUDIO_DEFAULT_TRACK (CO_CONTAINERFORMAT, CO_DATAFORMAT, CO_MEDIUMTYPE, NB_AUDIODEFAULTTRACK, NB_TRACK, CO_AUDIOCODING, CO_LANGUAGE, CO_QUALITATIVESTATUS, ID_USERLABEL)
    values (10030, 10003, 2, 1, 1, 1, 0, 0, 0)

  -- DEFAULT 2 : On autorise les STEREO (3) pour les AAC (10003) du MKV (10030)
  insert AUDIO_DEFAULT_TRACK (CO_CONTAINERFORMAT, CO_DATAFORMAT, CO_MEDIUMTYPE, NB_AUDIODEFAULTTRACK, NB_TRACK, CO_AUDIOCODING, CO_LANGUAGE, CO_QUALITATIVESTATUS, ID_USERLABEL)
    values (10030, 10003, 2, 2, 1, 3, 0, 0, 0)

  -- DEFAULT 3 : On autorise les Dolby5.1 (5) pour les AAC (10003) du MKV (10030)
  insert AUDIO_DEFAULT_TRACK (CO_CONTAINERFORMAT, CO_DATAFORMAT, CO_MEDIUMTYPE, NB_AUDIODEFAULTTRACK, NB_TRACK, CO_AUDIOCODING, CO_LANGUAGE, CO_QUALITATIVESTATUS, ID_USERLABEL)
    values (10030, 10003, 2, 3, 1, 5, 0, 0, 0)

  -- DEFAULT 4 : On autorise les DolbyE (6) pour les AAC (10003) du MKV (10030)
  insert AUDIO_DEFAULT_TRACK (CO_CONTAINERFORMAT, CO_DATAFORMAT, CO_MEDIUMTYPE, NB_AUDIODEFAULTTRACK, NB_TRACK, CO_AUDIOCODING, CO_LANGUAGE, CO_QUALITATIVESTATUS, ID_USERLABEL)
    values (10030, 10003, 2, 4, 1, 6, 0, 0, 0)

rollback tran


-- -------------------------------------------
-- COMMANDES POUR L'EDITION DIRECTE DES TABLES
-- -------------------------------------------

SELECT        TOP (200) CO_CONTAINERFORMAT, CO_DATAFORMAT, CO_MEDIUMTYPE, NB_AUDIODEFAULTTRACK, NB_TRACK, CO_AUDIOCODING, CO_LANGUAGE, CO_QUALITATIVESTATUS, ID_USERLABEL
FROM            AUDIO_DEFAULT_TRACK
WHERE        (CO_CONTAINERFORMAT = 10030)

SELECT        TOP (200) CO_CONTAINERFORMAT, CO_DATAFORMAT, NB_TRACK, LI_TRACKID, CO_AUDIOCODING, CO_AUDIOCOMBINATION, ID_USERLABEL, CO_MEDIUMTYPE, LI_PRESETLABEL, LO_ISDEFAULT
FROM            AUDIO_DEFAULT
WHERE        (CO_CONTAINERFORMAT = 10030)
ORDER BY CO_CONTAINERFORMAT, LI_TRACKID
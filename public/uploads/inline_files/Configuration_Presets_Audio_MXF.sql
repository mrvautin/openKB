-- ---------------------------------------------------
-- Configuration des AUDIOS DU MXF
-- Dans cette configuration, on active : PCM (3 codings) et DE-AUDIO (1 coding)
-- ---------------------------------------------------
use MAM


select * from AUDIO_DEFAULT where CO_CONTAINERFORMAT=10025
-- select * from AUDIO_CODING
-- select * from AUDIO_CHANNEL_COMBINATIONS
select * from AUDIO_DEFAULT_TRACK where CO_CONTAINERFORMAT=10025 order by 1,2
select * from AUDIO_CODING_COMBINATION where CO_DATAFORMAT=10009
select * from AUDIO_CODING_COMBINATION where CO_DATAFORMAT=10029


begin tran

-- -----------------------------------------------------------------------------
-- AJOUT PCM MONO pour MXF
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
	10025,
	10009,          -- PCM
	1, '1', 0, 24,  -- ID et Label de Track
	1, 256000, 9,   -- 1=Mono 3=Stereo 6=DolbyE 5=5.1
	1,
	0, 2, 0,
	'Add Mono',
	0)

-- -----------------------------------------------------------------------------
-- AJOUT PCM STEREO pour MXF
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
	10025,
	10009,          -- PCM
	2, '2', 0, 24,  -- ID et Label de Track
	3, 256000, 9,   -- 1=Mono 3=Stereo 6=DolbyE 5=5.1
	17,             -- 1="1"   17="1-2"
	0, 2, 0,
	'Add Stereo',
	0)
	
-- -----------------------------------------------------------------------------
-- AJOUT PCM DOLBY 5.1 pour MXF
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
	10025,
	10009,
	3, '3', 0, 24,  -- ID et Label de Track
	5, 256000, 9,   -- 1=Mono  3=Stereo 6=DolbyE 5=5.1
	29,             -- 1="1"   17="1-2"   29="1-2-3-4-5-6"
	0, 2, 0,
	'Add Dolby 5.1',
	0)

-- -----------------------------------------------------------------------------
-- AJOUT DOLBYE pour MXF
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
	10025,
	10029,           -- DE Audio
	4, '4', 0, 24,   -- ID et Label de Track
	6, 256000, 9,    -- 1=Mono 3=Stereo 6=DolbyE 5=5.1
	19,              -- 1="1"   17="1-2"  20="7-8"   29="1-2-3-4-5-6"
	0, 2, 0, 
	'Add Dolby-E',
	0)

rollback tran

-- --------------------------------------------------
-- On autorise les 4 pistes MONO / STEREO / 5.1 / DOLBY E
-- --------------------------------------------------
begin tran

  -- On autorise les MONO (1) pour les PCM (10009) du MXF (20025)
  insert AUDIO_DEFAULT_TRACK (CO_CONTAINERFORMAT, CO_DATAFORMAT, CO_MEDIUMTYPE, NB_AUDIODEFAULTTRACK, NB_TRACK, CO_AUDIOCODING, CO_LANGUAGE, CO_QUALITATIVESTATUS, ID_USERLABEL)
    values (10025, 10009, 2, 1, 1, 1, 0, 0, 0)

  -- On autorise les STEREO (3) pour les PCM (10009) du MXF (20025)
  insert AUDIO_DEFAULT_TRACK (CO_CONTAINERFORMAT, CO_DATAFORMAT, CO_MEDIUMTYPE, NB_AUDIODEFAULTTRACK, NB_TRACK, CO_AUDIOCODING, CO_LANGUAGE, CO_QUALITATIVESTATUS, ID_USERLABEL)
    values (10025, 10009, 2, 2, 1, 3, 0, 0, 0)

  -- On autorise les Dolby5.1 (5) pour les PCM (10009) du MXF (20025)
  insert AUDIO_DEFAULT_TRACK (CO_CONTAINERFORMAT, CO_DATAFORMAT, CO_MEDIUMTYPE, NB_AUDIODEFAULTTRACK, NB_TRACK, CO_AUDIOCODING, CO_LANGUAGE, CO_QUALITATIVESTATUS, ID_USERLABEL)
    values (10025, 10009, 2, 3, 1, 5, 0, 0, 0)
  -- On autorise les DolbyE (6) pour les DE-AUDIO (10029) du MXF (20025)

  insert AUDIO_DEFAULT_TRACK (CO_CONTAINERFORMAT, CO_DATAFORMAT, CO_MEDIUMTYPE, NB_AUDIODEFAULTTRACK, NB_TRACK, CO_AUDIOCODING, CO_LANGUAGE, CO_QUALITATIVESTATUS, ID_USERLABEL)
    values (10025, 10029, 2, 4, 1, 6, 0, 0, 0)
	
rollback tran
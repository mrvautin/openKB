<?xml version="1.0" encoding="iso-8859-1"?>
<xsl:stylesheet version="1.0"
		xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
		xmlns:msxsl="urn:schemas-microsoft-com:xslt"
		xmlns:user="urn:sgt.fr:msxsl-jscript-utilities"  >
	<xsl:output omit-xml-declaration="yes" method="xml" indent="yes"/>
	<xsl:template match="root">

		<xsl:element name="root" namespace="http://www.sgt.eu/FileDescription/">

			<xsl:attribute name="XMLSource">
				<xsl:value-of select="root/@XMLSource"/>
			</xsl:attribute>

			<xsl:element name="Container" namespace="http://www.sgt.eu/FileDescription/">

				<xsl:attribute name="FinalFileName">
					<xsl:value-of select="FileName" />
				</xsl:attribute>

				<xsl:if test="ContentStatus">
					<xsl:if test="ContentStatus!=''">
						<xsl:attribute name="Status">
							<xsl:value-of select="user:GetStatus(ContentStatus)" />
						</xsl:attribute>
					</xsl:if>
				</xsl:if>


				<xsl:if test="SOM">
					<xsl:if test="SOM!=''">
						<xsl:element name="TcStart" namespace="http://www.sgt.eu/FileDescription/">
							<xsl:attribute name="seconds">
								<xsl:value-of select="user:GetSeconds(SOM, 25.0)" />
							</xsl:attribute>
							<xsl:attribute name="framerate">25.0</xsl:attribute>
							<xsl:value-of select="SOM" />
						</xsl:element>
					</xsl:if>
				</xsl:if>

				<xsl:if test="Duration">
					<xsl:if test="Duration!=''">
						<xsl:element name="Duration" namespace="http://www.sgt.eu/FileDescription/">
							<xsl:attribute name="seconds">
								<xsl:value-of select="user:GetSeconds(Duration, 25.0)" />
							</xsl:attribute>
							<xsl:attribute name="framerate">25.0</xsl:attribute>
							<xsl:value-of select="Duration" />
						</xsl:element>
					</xsl:if>
				</xsl:if>

				<xsl:element name="Format"  namespace="http://www.sgt.eu/FileDescription/">
					<xsl:value-of select="Format" />
				</xsl:element>


				<xsl:element name="Video"  namespace="http://www.sgt.eu/FileDescription/">
					<xsl:element name="Format"  namespace="http://www.sgt.eu/FileDescription/">
						<xsl:value-of select="Format" />
					</xsl:element>									
					<xsl:element name="VideoFormat"  namespace="http://www.sgt.eu/FileDescription/">
						<xsl:value-of select="user:GetVideoFormat(Format)" />
					</xsl:element>
					<xsl:element name="ImageStoring"  namespace="http://www.sgt.eu/FileDescription/">
						<xsl:value-of select="user:GetImageStoring(Format)" />
					</xsl:element>

				</xsl:element>

				<xsl:element name="Audio"  namespace="http://www.sgt.eu/FileDescription/">
					<xsl:element name="Track"  namespace="http://www.sgt.eu/FileDescription/">
						<xsl:element name="Combination"  namespace="http://www.sgt.eu/FileDescription/">1-2</xsl:element>
						<xsl:element name="Format"  namespace="http://www.sgt.eu/FileDescription/">PCM</xsl:element>					
						<xsl:element name="Channels"  namespace="http://www.sgt.eu/FileDescription/">
							<xsl:element name="Channel"  namespace="http://www.sgt.eu/FileDescription/">
								<xsl:attribute name="Language">hrv</xsl:attribute>
								<xsl:attribute name="Format">Stereo</xsl:attribute>2.0</xsl:element>
						</xsl:element>					
					</xsl:element>					
				</xsl:element>

			</xsl:element>

			<xsl:element name="Metadata" namespace="http://www.sgt.eu/FileDescription/">

				<xsl:if test="ContentName">
					<xsl:if test="ContentName!=''">
						<xsl:element name="ContentName"  namespace="http://www.sgt.eu/FileDescription/">
							<xsl:value-of select="ContentName"/>
						</xsl:element>
					</xsl:if>
				</xsl:if>

				<xsl:element name="Gender"  namespace="http://www.sgt.eu/FileDescription/">Video</xsl:element>

				<xsl:if test="Type">
					<xsl:if test="Type!=''">
						<xsl:element name="Type"  namespace="http://www.sgt.eu/FileDescription/">
							<xsl:value-of select="Type" />
						</xsl:element>
					</xsl:if>
				</xsl:if>

				<xsl:if test="Folio">
					<xsl:if test="Folio!=''">
						<xsl:element name="Folio"  namespace="http://www.sgt.eu/FileDescription/">
							<xsl:value-of select="Folio"/>
						</xsl:element>
					</xsl:if>
				</xsl:if>

				<xsl:element name="Userdata" namespace="http://www.sgt.eu/FileDescription/">
					<xsl:for-each select="Userfields/Data">
						<xsl:element name="Data" namespace="http://www.sgt.eu/FileDescription/">
							<xsl:attribute name="Label">
								<xsl:value-of select="Label" />
							</xsl:attribute>
							<xsl:attribute name="Value">
								<xsl:value-of select="Value" />
							</xsl:attribute>
						</xsl:element>
					</xsl:for-each>
				</xsl:element>

				<xsl:if test="ContentStatus">
					<xsl:if test="ContentStatus!=''">
						<xsl:element name="Status"  namespace="http://www.sgt.eu/FileDescription/">
							<xsl:value-of select="user:GetStatus(ContentStatus)" />
						</xsl:element>
					</xsl:if>
				</xsl:if>

				<xsl:element name="Packings" namespace="http://www.sgt.eu/FileDescription/">
					<xsl:element name="Packing" namespace="http://www.sgt.eu/FileDescription/">
						<xsl:attribute name="Default">true</xsl:attribute>
						<xsl:attribute name="Name">
							<xsl:value-of select="Packing/@Name" />
						</xsl:attribute>
						<xsl:for-each select="Packing/PackingPart">
							<xsl:element name="PackingPart" namespace="http://www.sgt.eu/FileDescription/">
								<xsl:attribute name="Part">
									<xsl:value-of select="Part" />
								</xsl:attribute>

								<xsl:element name="OffsetIn" namespace="http://www.sgt.eu/FileDescription/">
									<xsl:value-of select="user:GetMicroSeconds(OffsetIn, 25.0)" />
								</xsl:element>

								<xsl:if test="../../SOM">
									<xsl:if test="../../SOM!=''">
										<xsl:element name="TcIn" namespace="http://www.sgt.eu/FileDescription/">
											<xsl:value-of select="user:GetTcIn(user:GetMicroSeconds(OffsetIn, 25.0), user:GetMicroSeconds(../../SOM, 25.0))" />
										</xsl:element>
									</xsl:if>
								</xsl:if>


								<xsl:element name="Duration" namespace="http://www.sgt.eu/FileDescription/">
									<xsl:value-of select="user:GetMicroSeconds(Duration, 25.0)" />
								</xsl:element>
							</xsl:element>
						</xsl:for-each>
					</xsl:element>
				</xsl:element>

			</xsl:element>

		</xsl:element>

	</xsl:template>




	<msxsl:script language="c#" implements-prefix="user">
		<![CDATA[

public double GetSeconds(string Tc, double Framerate)
{
	Tc.Replace(";",":");
  	string[] Tcs = Tc.Split(':');
	int i;
    double Seconds = 0;
	for (i = 0; i < Tcs.Length-1 ; i++)
	{
		Seconds = Seconds * 60 + Convert.ToInt32(Tcs[i]);
	}  
	Seconds = Seconds + Convert.ToInt32(Tcs[Tcs.Length-1]) / Framerate;
	return Seconds ;
}

public double GetMicroSeconds(string Tc, double Framerate)
{ 
	double MicroSeconds = GetSeconds(Tc, Framerate)*1000*1000;
	return Convert.ToInt64(MicroSeconds);
}

public double GetTcIn(double OffsetIn, double SOM)
{ 
	return OffsetIn + SOM;
}

public string GetVideoFormat(string Format)
{ 
	if(Format == "MPEG2-HD")
		return "16/9";
	else
		return "4/3";
}

public string GetImageStoring(string Format)
{ 
	if(Format == "MPEG2-HD")
		return "16/9";
	else
		return "4/3";
}
	  
public string GetStatus(string ContentStatus)
{ 
	if(ContentStatus == "Broadcastable")
		return "Accepted";
	
	if(ContentStatus == "Unbroadcastable")
		return "Refused";
  
	return "Unknown";
}

]]>
	</msxsl:script>
</xsl:stylesheet>

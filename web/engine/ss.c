/* StarSource: thin C wrapper around the Swiss Ephemeris, compiled to wasm32-wasi.
   Every function writes into static buffers (OUT doubles, STR chars) that JS reads from linear memory. */
#include <string.h>
#include "swephexp.h"
static double OUT[128];
static char STR[512];
static char IN[512];
double *ss_out(void){ return OUT; }
char *ss_str(void){ return STR; }
char *ss_in(void){ return IN; }
void ss_set_ephe_path(void){ swe_set_ephe_path(IN); }
void ss_version(void){ swe_version(STR); }
void ss_close(void){ swe_close(); }
int ss_calc_ut(double jd, int ipl, int flag){ STR[0]=0; return swe_calc_ut(jd, ipl, flag, OUT, STR); }
int ss_houses(double jd, int flag, double lat, double lon, int hsys){
  /* OUT[0..36] cusps (index 1..12, or 1..36 for Gauquelin), OUT[40..49] ascmc, OUT[50..86] cusp speeds, OUT[90..99] ascmc speeds */
  memset(OUT,0,sizeof OUT); STR[0]=0;
  return swe_houses_ex2(jd, flag, lat, lon, hsys, OUT, OUT+40, OUT+50, OUT+90, STR);
}
int ss_houses_armc(double armc, double lat, double eps, int hsys){
  memset(OUT,0,sizeof OUT); STR[0]=0;
  return swe_houses_armc_ex2(armc, lat, eps, hsys, OUT, OUT+40, OUT+50, OUT+90, STR);
}
double ss_house_pos(double armc, double geolat, double eps, int hsys, double lon, double lat){
  double xpin[2]={lon,lat}; STR[0]=0; return swe_house_pos(armc, geolat, eps, hsys, xpin, STR);
}
void ss_house_name(int hsys){ const char *n = swe_house_name(hsys); strncpy(STR, n?n:"", 511); STR[511]=0; }
void ss_set_sid_mode(int mode, double t0, double ayan_t0){ swe_set_sid_mode(mode, t0, ayan_t0); }
int ss_ayanamsa(double jd, int flag){ STR[0]=0; return swe_get_ayanamsa_ex_ut(jd, flag, OUT, STR); }
void ss_ayanamsa_name(int mode){ const char *n = swe_get_ayanamsa_name(mode); strncpy(STR, n?n:"", 511); STR[511]=0; }
void ss_planet_name(int ipl){ swe_get_planet_name(ipl, STR); }
double ss_julday(int y, int m, int d, double h, int greg){ return swe_julday(y, m, d, h, greg); }
void ss_revjul(double jd, int greg){ int y,m,d; double h; swe_revjul(jd, greg, &y, &m, &d, &h); OUT[0]=y; OUT[1]=m; OUT[2]=d; OUT[3]=h; }
/* UTC civil time → OUT[0] = JD(ET/TT), OUT[1] = JD(UT1); handles leap seconds */
int ss_utc_to_jd(int y, int m, int d, int h, int mi, double s, int greg){ STR[0]=0; return swe_utc_to_jd(y, m, d, h, mi, s, greg, OUT, STR); }
double ss_deltat(double jd){ return swe_deltat(jd); }
double ss_sidtime(double jd){ return swe_sidtime(jd); }
void ss_set_topo(double lon, double lat, double alt){ swe_set_topo(lon, lat, alt); }
/* fixed star: name in IN (in/out), OUT[0..5] */
int ss_fixstar(double jd, int flag){ STR[0]=0; int r = swe_fixstar2_ut(IN, jd, flag, OUT, STR); return r; }
int ss_nod_aps(double jd, int ipl, int flag, int method){ STR[0]=0; return swe_nod_aps_ut(jd, ipl, flag, method, OUT, OUT+6, OUT+12, OUT+18, STR); }
int ss_cotrans(double lon, double lat, double eps){ double x[3]={lon,lat,1}; swe_cotrans(x, OUT, eps); return 0; }

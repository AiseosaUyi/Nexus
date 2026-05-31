/**
 * Inline SVG defs for the Nexus illustrated characters.
 * Render once near the top of a page, then use <svg><use href="#c-ID" /></svg> anywhere.
 */
export default function CharacterSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {/* full-body girl — bun, clay dress, presenting */}
        <symbol id="c-girl" viewBox="0 0 110 178" stroke="#2b251c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M48 122 L45 154" /><path d="M64 122 L67 154" />
          <ellipse cx="43" cy="156" rx="8" ry="4.5" fill="#2b251c" stroke="none" /><ellipse cx="69" cy="156" rx="8" ry="4.5" fill="#2b251c" stroke="none" />
          <path d="M42 56 Q56 50 70 56 L78 124 Q56 134 34 124 Z" fill="#b14e2c" />
          <path d="M44 64 L29 90" /><circle cx="27" cy="93" r="5" fill="#e9b784" />
          <path d="M68 62 L86 38" /><circle cx="88" cy="35" r="5" fill="#e9b784" /><path d="M88 33 L91 25" />
          <circle cx="56" cy="36" r="19" fill="#e9b784" />
          <path d="M37 36 Q39 14 56 15 Q73 14 75 36" fill="#2b251c" stroke="none" /><circle cx="56" cy="13" r="6.5" fill="#2b251c" stroke="none" />
          <circle cx="50" cy="38" r="2.6" fill="#2b251c" stroke="none" /><circle cx="62" cy="38" r="2.6" fill="#2b251c" stroke="none" />
          <path d="M50 47 Q56 52 62 47" />
          <circle cx="44" cy="45" r="4" fill="#b14e2c" opacity=".25" stroke="none" /><circle cx="68" cy="45" r="4" fill="#b14e2c" opacity=".25" stroke="none" />
        </symbol>

        {/* a diverse team of three */}
        <symbol id="c-team" viewBox="0 0 286 176" stroke="#2b251c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M40 122 L37 153" /><path d="M54 122 L57 153" /><ellipse cx="35" cy="155" rx="7.5" ry="4" fill="#2b251c" stroke="none" /><ellipse cx="59" cy="155" rx="7.5" ry="4" fill="#2b251c" stroke="none" />
          <path d="M32 58 Q46 52 60 58 L66 124 Q46 132 26 124 Z" fill="#5e7152" />
          <path d="M34 66 L24 90" /><circle cx="22" cy="93" r="4.6" fill="#d9a878" /><path d="M60 64 L74 42" /><circle cx="76" cy="39" r="4.6" fill="#d9a878" />
          <path d="M80 33 q4 -3 7 -1" opacity=".4" />
          <circle cx="46" cy="36" r="17" fill="#d9a878" /><path d="M30 36 Q32 16 46 17 Q60 16 62 36" fill="#2b251c" stroke="none" /><circle cx="46" cy="15" r="6" fill="#2b251c" stroke="none" />
          <circle cx="41" cy="37" r="2.4" fill="#2b251c" stroke="none" /><circle cx="51" cy="37" r="2.4" fill="#2b251c" stroke="none" /><path d="M41 45 Q46 49 51 45" />
          <path d="M134 116 L131 153" /><path d="M150 116 L153 153" /><ellipse cx="129" cy="155" rx="8" ry="4.2" fill="#2b251c" stroke="none" /><ellipse cx="155" cy="155" rx="8" ry="4.2" fill="#2b251c" stroke="none" />
          <path d="M122 50 Q142 44 162 50 L156 116 Q142 122 128 116 Z" fill="#b14e2c" />
          <path d="M140 50 L146 50 L143 66 Z" fill="#c08a3e" stroke="none" />
          <rect x="115" y="76" width="27" height="19" rx="3" fill="#2b251c" /><line x1="120" y1="82" x2="137" y2="82" stroke="#f3ddc0" strokeWidth="2" /><line x1="120" y1="88" x2="132" y2="88" stroke="#d9a878" strokeWidth="2" />
          <path d="M127 60 L120 79" /><circle cx="118" cy="83" r="4.8" fill="#a9764a" /><path d="M160 58 L168 86" /><circle cx="169" cy="89" r="4.8" fill="#a9764a" />
          <circle cx="142" cy="30" r="18.5" fill="#a9764a" /><path d="M122 30 Q124 10 142 11 Q160 10 162 30 Q142 23 122 30 Z" fill="#2b251c" stroke="none" />
          <circle cx="136" cy="31" r="2.5" fill="#2b251c" stroke="none" /><circle cx="148" cy="31" r="2.5" fill="#2b251c" stroke="none" /><path d="M136 40 Q142 45 148 40" />
          <path d="M224 122 L221 153" /><path d="M238 122 L241 153" /><ellipse cx="219" cy="155" rx="7.5" ry="4" fill="#2b251c" stroke="none" /><ellipse cx="243" cy="155" rx="7.5" ry="4" fill="#2b251c" stroke="none" />
          <path d="M212 56 Q230 50 248 56 L254 124 Q230 132 206 124 Z" fill="#c08a3e" />
          <path d="M214 64 L206 90" /><circle cx="204" cy="93" r="4.6" fill="#f3ddc0" /><path d="M248 62 L262 42" /><circle cx="264" cy="39" r="4.6" fill="#f3ddc0" />
          <path d="M210 40 Q208 14 230 13 Q252 14 250 40 Q244 31 238 35 Q232 27 226 33 Q220 27 214 35 Q210 33 210 40 Z" fill="#6b4a2e" stroke="none" />
          <circle cx="230" cy="39" r="16.5" fill="#f3ddc0" />
          <circle cx="224" cy="40" r="5" stroke="#2b251c" strokeWidth="2" /><circle cx="236" cy="40" r="5" stroke="#2b251c" strokeWidth="2" /><line x1="229" y1="40" x2="231" y2="40" stroke="#2b251c" strokeWidth="2" />
          <path d="M225 49 Q230 53 235 49" />
        </symbol>

        {/* waving — green top, light skin */}
        <symbol id="c-wave" viewBox="0 0 120 168" stroke="#2b251c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M52 108 L50 150" /><path d="M68 108 L70 150" /><ellipse cx="48" cy="152" rx="9" ry="5" fill="#2b251c" stroke="none" /><ellipse cx="72" cy="152" rx="9" ry="5" fill="#2b251c" stroke="none" />
          <path d="M40 60 Q60 54 80 60 L74 108 Q60 114 46 108 Z" fill="#5e7152" />
          <path d="M44 66 L33 96" /><circle cx="32" cy="99" r="5" fill="#fcf9f2" /><path d="M76 64 L98 38" /><circle cx="100" cy="35" r="5.5" fill="#fcf9f2" />
          <path d="M107 29 q4 -3 7 -1" opacity=".45" /><path d="M105 22 q5 -4 10 -2" opacity=".35" />
          <circle cx="60" cy="34" r="22" fill="#fcf9f2" /><path d="M39 32 Q41 10 60 11 Q79 10 81 32" fill="#2b251c" stroke="none" />
          <circle cx="53" cy="35" r="2.6" fill="#2b251c" stroke="none" /><circle cx="67" cy="35" r="2.6" fill="#2b251c" stroke="none" /><path d="M54 44 Q60 50 66 44" />
          <circle cx="47" cy="42" r="4" fill="#b14e2c" opacity=".22" stroke="none" /><circle cx="73" cy="42" r="4" fill="#b14e2c" opacity=".22" stroke="none" />
        </symbol>

        {/* jumping */}
        <symbol id="c-jump" viewBox="0 0 140 150" stroke="#2b251c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M38 138 q10 6 22 4" opacity=".4" /><path d="M80 142 q10 -2 20 -8" opacity=".4" />
          <path d="M58 96 L46 116 L52 132" /><path d="M82 96 L96 114 L92 132" /><ellipse cx="52" cy="134" rx="8" ry="4.5" fill="#2b251c" stroke="none" /><ellipse cx="92" cy="134" rx="8" ry="4.5" fill="#2b251c" stroke="none" />
          <path d="M50 54 Q70 48 90 54 L84 98 Q70 104 56 98 Z" fill="#b14e2c" />
          <path d="M55 60 L37 34" /><circle cx="35" cy="31" r="5" fill="#fcf9f2" /><path d="M85 60 L103 34" /><circle cx="105" cy="31" r="5" fill="#fcf9f2" />
          <circle cx="70" cy="34" r="21" fill="#fcf9f2" /><path d="M51 32 Q53 11 70 12 Q87 11 89 32" fill="#2b251c" stroke="none" />
          <circle cx="63" cy="33" r="2.6" fill="#2b251c" stroke="none" /><circle cx="77" cy="33" r="2.6" fill="#2b251c" stroke="none" />
          <path d="M64 41 Q70 50 76 41 Z" fill="#2b251c" stroke="none" />
          <circle cx="57" cy="41" r="4" fill="#b14e2c" opacity=".22" stroke="none" /><circle cx="83" cy="41" r="4" fill="#b14e2c" opacity=".22" stroke="none" />
        </symbol>

        {/* writing — sage dress, holding pencil */}
        <symbol id="c-write" viewBox="0 0 150 162" stroke="#2b251c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M58 110 L56 150" /><path d="M74 110 L78 150" /><ellipse cx="54" cy="152" rx="9" ry="5" fill="#2b251c" stroke="none" /><ellipse cx="80" cy="152" rx="9" ry="5" fill="#2b251c" stroke="none" />
          <path d="M46 62 Q66 56 86 62 L80 110 Q66 116 52 110 Z" fill="#5e7152" />
          <rect x="98" y="30" width="15" height="64" rx="4" fill="#c08a3e" /><path d="M98 94 L105.5 110 L113 94 Z" fill="#fcf9f2" /><path d="M103 104 L105.5 110 L108 104 Z" fill="#2b251c" stroke="none" /><rect x="98" y="24" width="15" height="8" rx="3" fill="#b14e2c" />
          <path d="M52 70 L84 80" /><circle cx="86" cy="81" r="5" fill="#fcf9f2" /><path d="M82 64 L100 72" /><circle cx="103" cy="73" r="5" fill="#fcf9f2" />
          <circle cx="64" cy="38" r="22" fill="#fcf9f2" /><path d="M44 36 Q46 14 64 15 Q82 14 84 36" fill="#2b251c" stroke="none" />
          <circle cx="60" cy="40" r="2.6" fill="#2b251c" stroke="none" /><circle cx="74" cy="40" r="2.6" fill="#2b251c" stroke="none" /><path d="M58 48 Q64 53 70 48" />
          <circle cx="53" cy="46" r="4" fill="#b14e2c" opacity=".22" stroke="none" /><circle cx="79" cy="46" r="4" fill="#b14e2c" opacity=".22" stroke="none" />
        </symbol>
      </defs>
    </svg>
  );
}

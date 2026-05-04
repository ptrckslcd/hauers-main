const fs = require('fs');

let html = fs.readFileSync('views/app/dashboard.ejs', 'utf8');

// The chunk we want to replace is from:
// <!-- ── Announcements Banner ── -->
// up to:
// </main>
const pattern = /<!-- ── Announcements Banner ── -->[\s\S]*?(?=<\/main>)/;

const newHtml = `<!-- ── Announcements Banner ── -->
      <div id="announcements-banner-placeholder"></div>

      <!-- ── Main grid ── -->
      <div class="home-main-grid">

        <!-- Activity: 4 top cards -->
        <div class="home-stats-row">

          <div class="dash-card home-stat-card">
            <div class="home-stat-ico-wrap home-stat-ico-wrap--purple" aria-hidden="true" style="background:var(--bg-accent-soft);color:var(--text-accent)">
              <span class="material-symbols-outlined">analytics</span>
            </div>
            <div class="home-stat-copy">
              <span class="home-stat-value"><span id="home-stat-readiness">—</span><span style="font-size: 0.65em; font-weight: normal; color: var(--text-subdued);">/100</span></span>
              <span class="home-stat-label">Exam readiness</span>
            </div>
          </div>

          <div class="dash-card home-stat-card">
            <div class="home-stat-ico-wrap home-stat-ico-wrap--fire" aria-hidden="true">
              <span class="material-symbols-outlined">local_fire_department</span>
            </div>
            <div class="home-stat-copy">
              <span class="home-stat-value" id="home-streak">0</span>
              <span class="home-stat-label">Day study streak</span>
            </div>
          </div>

          <div class="dash-card home-stat-card">
            <div class="home-stat-ico-wrap home-stat-ico-wrap--blue" aria-hidden="true">
              <span class="material-symbols-outlined">event_available</span>
            </div>
            <div class="home-stat-copy">
              <span class="home-stat-value" id="home-session-count">0</span>
              <span class="home-stat-label">Sessions completed</span>
            </div>
          </div>

          <div class="dash-card home-stat-card" id="home-tile-exam">
            <div class="home-stat-ico-wrap home-stat-ico-wrap--amber" aria-hidden="true">
              <span class="material-symbols-outlined">hourglass_bottom</span>
            </div>
            <div class="home-stat-copy">
              <span class="home-stat-value home-stat-value--days" id="home-days-left">—</span>
              <span class="home-stat-label">Days to exam</span>
              <span class="home-stat-meta" id="home-exam-date-label" hidden></span>
            </div>
          </div>
        </div>

        <!-- Today's Focus -->
        <section class="home-recs-section" style="margin-top: 0;" aria-labelledby="home-focus-heading">
          <div class="home-recs-header">
            <div>
              <h2 class="home-recs-title" id="home-focus-heading">Today's Focus</h2>
              <p class="home-recs-sub">Study plan recommendations for today</p>
            </div>
          </div>
          <div id="home-focus-content" class="home-rec-list">
             <div class="home-rec-empty">
               <p>Loading study plan...</p>
             </div>
          </div>
        </section>

        <!-- Recommended Materials -->
        <section class="home-recs-section" style="margin-top: 0;" aria-labelledby="home-recs-heading">
          <div class="home-recs-header">
            <div>
              <h2 class="home-recs-title" id="home-recs-heading">Recommended Materials</h2>
            </div>
            <a href="/reviewee/materials" class="home-recs-seeall">
              See all
              <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
            </a>
          </div>
          <div id="home-rec-list" class="home-rec-list">
            <div class="home-rec-empty">
              <span class="material-symbols-outlined" aria-hidden="true">auto_stories</span>
              <p>Complete your pre-test to get personalised recommendations.</p>
            </div>
          </div>
        </section>

        <!-- Recent Activity -->
        <section class="home-recs-section" style="margin-top: 0;" aria-labelledby="home-recent-heading">
          <div class="home-recs-header">
            <div>
              <h2 class="home-recs-title" id="home-recent-heading">Recent Activity</h2>
            </div>
            <a href="/reviewee/progress" class="home-recs-seeall">
              Full Progress
              <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
            </a>
          </div>
          <div id="home-recent-list" class="home-rec-list">
             <div class="home-rec-empty">
               <p>No recent activity yet.</p>
             </div>
          </div>
        </section>

        <!-- Readiness Card (Performance by domain) - placed at the bottom so it doesn't take too much vertical height -->
        <div class="dash-card home-readiness-card" id="home-readiness-card" style="margin-top: 0;">
          <div class="home-readiness-layout">
            <section class="home-readiness-summary" aria-labelledby="home-readiness-heading">
              <p class="home-card-eyebrow">Performance by Domain</p>
              <h2 class="visually-hidden" id="home-readiness-heading">Exam readiness profile</h2>
              <div class="home-score-row" style="display:none;">
                <span class="home-score-num" id="home-score-num">—</span>
              </div>
              <p class="home-gap-note">View your strengths and weaknesses across subjects.</p>
            </section>
            <section class="home-readiness-visual" aria-label="Interactive domain readiness chart">
              <div class="home-domain-chart-wrap" id="home-domain-chart-wrap">
                <canvas id="home-domain-chart" aria-label="Domain score radar chart"></canvas>
              </div>
              <div class="home-domain-pills" id="home-domain-pills" aria-label="Domain insights"></div>
            </section>
          </div>
        </div>

      </div>
      `;

html = html.replace(pattern, newHtml);

html = html.replace(/if \(statReadinessEl\) statReadinessEl\.textContent = \(pct \|\| 0\) \+ '%';/, "if (statReadinessEl) statReadinessEl.textContent = (pct || 0);");

fs.writeFileSync('views/app/dashboard.ejs', html);
console.log("Updated layout.");

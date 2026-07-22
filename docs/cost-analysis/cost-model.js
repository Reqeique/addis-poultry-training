// Cost model for the poultry-training app on Supabase (Pro) + Cloudflare R2.
// Outputs: console table + pgfplots coordinate rows + LaTeX tables (to stdout as TSV-ish).
const fmt = (n) => (n >= 1e6 ? (n/1e6).toExponential(2) : n >= 1000 ? n.toLocaleString('en-US',{maximumFractionDigits:0}) : n.toFixed(2))

// ---- App workload assumptions (per MONTH) ----
// MAU = monthly active users (the active fraction of registered accounts).
const activeFrac = 0.40 // 40% of registered users are active in a month
const dauPerMau = 0.35   // 35% of MAU are daily active on average
const avgSessionMin = 8  // avg active session length per DAU visit
const sessionsPerDauPerMonth = 12 // avg sessions per DAU in the month

// Trainer:trainee ratio 1:50 ; a fraction of users are trainers.
const trainerFrac = 0.02 // 2% of accounts are trainers

// Per active trainee per month (DAU basis):
const inquiriesPerTraineePerMonth = 10   // ~10 inquiries with media/text
const mediaUploadsPerTraineePerMonth = 10 // one media per inquiry
const videoShare = 0.5, imageShare = 0.5
const videoMB = 3, imageMB = 0.15        // compressed sizes from app
const messagesPerTraineePerMonth = 200     // chat messages sent/received
const traineeMessagePollKB = 1.2          // trainee page poll response ~1.2KB (every 5s while open)

// Postgres row sizes (avg, incl. indexes overhead factor ~1.6)
const rowFactor = 1.6
const sizeProfile = 2*1024
const sizeMessage = 0.5*1024
const sizeInquiry = 3*1024
const sizeChatPart = 0.3*1024
const sizeRowAuthUser = 0.5*1024

// ---- Supabase Pro pricing (USD per month) ----
const PRO = 25
const MAU_FREE = 100000, MAU_RATE = 0.00325
const EGRESS_FREE = 250, EGRESS_RATE = 0.09       // uncached egress $/GB (Supabase egress = DB+storage out)
const DISK_FREE = 8, DISK_RATE = 0.125            // $/GB over 8GB
const STORAGE_FREE = 100, STORAGE_RATE = 0.0213   // Supabase Storage $/GB (we use R2 for media, so ~0)
const EF_FREE = 2_000_000, EF_RATE = 2 / 1_000_000 // edge function invocations
const RT_CONN_FREE = 500, RT_CONN_RATE = 10/1000   // realtime concurrent peak connections
const RT_MSG_FREE = 5_000_000, RT_MSG_RATE = 2.5/1_000_000
// Compute sizes (monthly). We pick a compute size per band.
const COMPUTE = {
  Micro: 10, Small: 15, Medium: 60, Large: 110, XL: 210, '2XL': 410,
  '4XL': 960, '8XL': 1870, '12XL': 2800, '16XL': 3730,
}
const COMPUTE_CREDIT = 10 // included monthly

// ---- Cloudflare R2 pricing (USD per month) ----
const R2_STORAGE_FREE = 10, R2_STORAGE_RATE = 0.015  // $/GB-month
const R2_CLASSA_FREE = 1_000_000, R2_CLASSA_RATE = 4.5 / 1_000_000
const R2_CLASSB_FREE = 10_000_000, R2_CLASSB_RATE = 0.36 / 1_000_000
// R2 egress: FREE

function over(usage, free, rate){ return Math.max(0, usage - free) * rate }
function max0(x){ return Math.max(0, x) }

function model(users){
  const mau = users * activeFrac
  const dau = mau * dauPerMau
  const traineeUsers = users * (1 - trainerFrac)
  const trainerUsers = users * trainerFrac
  const mauTrainee = mau * (1 - trainerFrac)
  const dauTrainee = dau * (1 - trainerFrac)

  // --- Supabase Auth MAU ---
  const authMauCost = over(mau, MAU_FREE, MAU_RATE)

  // --- Edge Function invocations ---
  // Estimate: chat-media upload API + inquiry submit + chat send + poll endpoints.
  // Polls: trainee polls every 5s during session. sessionsPerDauPerMonth * dauTrainee * (sessionMin*60/5)
  const pollsPerTrainee = sessionsPerDauPerMonth * (avgSessionMin*60/5)
  const efInvocations = mauTrainee * inquiriesPerTraineePerMonth * 2        // submit inquiry + media upload endpoint
      + mauTrainee * messagesPerTraineePerMonth                              // send message
      + dauTrainee * pollsPerTrainee                                          // poll endpoints
      + (mau * 40)                                                            // misc / chat subscribe / profile fetches
  const efCost = over(efInvocations, EF_FREE, EF_RATE)

  // --- Realtime concurrent peak & messages ---
  // Peak concurrent ~ dau (worst-case all online). Use a peak factor 0.6 of dau.
  const rtPeakConn = dau * 0.6
  const rtConnCost = over(rtPeakConn, RT_CONN_FREE, RT_CONN_RATE)
  const rtMessages = mauTrainee * messagesPerTraineePerMonth // messages delivered via realtime
  const rtMsgCost = over(rtMessages, RT_MSG_FREE, RT_MSG_RATE)

  // --- Egress (uncached) ---
  // Dominant: trainee poll responses + chat list + message threads + media reads from R2-via-pages.
  const pollEgressGB = (dauTrainee * pollsPerTrainee * traineeMessagePollKB) / 1_048_576 // KB->GB (1024)
  const chatListEgressGB = (mau * 20 * 50) / 1_073_741_824 // 20 chats * 50KB per list load
  const apiEgressGB = (mau * 5) / 1024 // misc API ~5MB/user/month
  const totalEgressGB = pollEgressGB + chatListEgressGB + apiEgressGB
  const egressCost = over(totalEgressGB, EGRESS_FREE, EGRESS_RATE)

  // --- Postgres DB storage ---
  const profilesGB = (traineeUsers*sizeProfile + trainerUsers*sizeProfile) * rowFactor / 1_073_741_824
  const authUsersGB = (users*sizeRowAuthUser) * rowFactor / 1_073_741_824
  // churn: keep 6 months of messages/inquiries
  const monthsKept = 6
  const messagesGB = (mauTrainee * messagesPerTraineePerMonth * monthsKept * sizeMessage * rowFactor) / 1_073_741_824
  const inquiriesGB = (mauTrainee * inquiriesPerTraineePerMonth * monthsKept * sizeInquiry * rowFactor) / 1_073_741_824
  const chatGB = (mauTrainee * 4 * sizeChatPart * rowFactor) / 1_073_741_824 // ~4 chats per trainee
  const dbGB = profilesGB + authUsersGB + messagesGB + inquiriesGB + chatGB
  const diskCost = over(dbGB, DISK_FREE, DISK_RATE)

  // --- Compute size selection (heuristic by DAU / connections / DB size) ---
  let size = 'Micro'
  if (dau > 500 || dbGB > 8) size = 'Small'
  if (dau > 3000 || dbGB > 20) size = 'Medium'
  if (dau > 12000 || dbGB > 60) size = 'Large'
  if (dau > 40000 || dbGB > 150) size = 'XL'
  if (dau > 120000 || dbGB > 400) size = '2XL'
  if (dau > 350000 || dbGB > 1000) size = '4XL'
  if (dau > 900000 || dbGB > 2500) size = '8XL'
  if (dau > 2500000 || dbGB > 6000) size = '12XL'
  if (dau > 6000000 || dbGB > 12000) size = '16XL'
  const computeCost = max0(COMPUTE[size] - COMPUTE_CREDIT)

  // --- Cloudflare R2 ---
  const mediaGB = (mauTrainee * mediaUploadsPerTraineePerMonth * (videoShare*videoMB + imageShare*imageMB)) / 1024
  // cumulative storage (assume 12 months retention by default; old media lifecycle)
  const r2RetentionMonths = 12
  const r2StoredGB = mediaGB * r2RetentionMonths
  const classA = mauTrainee * mediaUploadsPerTraineePerMonth * 1.2 // multipart/write ops
  const classB = mauTrainee * mediaUploadsPerTraineePerMonth * 4    // reads per media (trainer + trainee views)
  const r2StorageCost = over(r2StoredGB, R2_STORAGE_FREE, R2_STORAGE_RATE)
  const r2ClassACost = over(classA, R2_CLASSA_FREE, R2_CLASSA_RATE)
  const r2ClassBCost = over(classB, R2_CLASSB_FREE, R2_CLASSB_RATE)
  const r2Total = r2StorageCost + r2ClassACost + r2ClassBCost

  // --- Totals ---
  const supabaseBase = PRO + computeCost
  const supabaseUsage = authMauCost + efCost + egressCost + diskCost + rtConnCost + rtMsgCost
  const supabaseTotal = supabaseBase + supabaseUsage
  const total = supabaseTotal + r2Total

  return {
    users, mau, dau, size,
    dbGB, totalEgressGB, efInvocations, rtPeakConn, r2StoredGB, mediaGB,
    PRO, computeCost,
    authMauCost, efCost, egressCost, diskCost, rtConnCost, rtMsgCost,
    supabaseBase, supabaseUsage, supabaseTotal,
    r2StorageCost, r2ClassACost, r2ClassBCost, r2Total,
    total,
  }
}

const bands = [1, 50, 500, 1_000, 10_000, 100_000, 1_000_000, 10_000_000]
console.log('# Cost model output')
console.log('users\tMAU\tDAU\tcompute\tdbGB\tegressGB\tEF(inv)\tR2(GB)\tPro\tCompute\tAuthMAU\tEdgeFn\tEgress\tDisk\tRTconn\tRTmsg\tSupaBase\tSupaUsage\tSupaTotal\tR2stor\tR2clsA\tR2clsB\tR2Total\tGRAND')
const rows = bands.map(model)
for (const r of rows){
  console.log([r.users,r.mau.toFixed(0),r.dau.toFixed(0),r.size,r.dbGB.toFixed(2),r.totalEgressGB.toFixed(1),r.efInvocations.toFixed(0),r.r2StoredGB.toFixed(1),r.PRO,r.computeCost.toFixed(0),r.authMauCost.toFixed(2),r.efCost.toFixed(2),r.egressCost.toFixed(2),r.diskCost.toFixed(2),r.rtConnCost.toFixed(2),r.rtMsgCost.toFixed(2),r.supabaseBase.toFixed(0),r.supabaseUsage.toFixed(2),r.supabaseTotal.toFixed(2),r.r2StorageCost.toFixed(2),r.r2ClassACost.toFixed(2),r.r2ClassBCost.toFixed(2),r.r2Total.toFixed(2),r.total.toFixed(2)].join('\t'))
}

// pgfplots coordinates (log scale x) for total cost
console.log('\n#PGFPOINTS_TOTAL')
for (const r of rows) console.log(`(${r.users},${r.total})`)
console.log('#PGFPOINTS_SUPABASE')
for (const r of rows) console.log(`(${r.users},${r.supabaseTotal})`)
console.log('#PGFPOINTS_R2')
for (const r of rows) console.log(`(${r.users},${r.r2Total})`)
console.log('#PGFPOINTS_STACK') // for stacked: auth, ef, egress, disk, compute, r2
for (const r of rows) console.log([r.users,r.authMauCost,r.efCost,r.egressCost,r.diskCost,r.computeCost+r.PRO,r.r2Total].join(','))

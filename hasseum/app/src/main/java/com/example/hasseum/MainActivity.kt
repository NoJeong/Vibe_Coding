package com.example.hasseum

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.speech.RecognizerIntent
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.example.hasseum.database.*
import com.example.hasseum.notification.UpdateRecordsWorker
import com.example.hasseum.ui.theme.HasseumTheme
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.*
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, true)
        setContent {
            HasseumTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val context = LocalContext.current
                    val db = AppDatabase.getDatabase(context)
                    val recordDao = db.recordDao()
                    val keywordDao = db.keywordDao()
                    CalendarScreen(recordDao = recordDao, keywordDao = keywordDao)
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun CalendarScreen(modifier: Modifier = Modifier, recordDao: RecordDao, keywordDao: KeywordDao) {
    var selectedDate by remember { mutableStateOf<LocalDate?>(LocalDate.now()) }
    var showVoicePopup by remember { mutableStateOf(false) }
    var showKeywordDialog by remember { mutableStateOf(false) }
    var showSearchDialog by remember { mutableStateOf(false) }
    var showStatisticsDialog by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()
    val initialMonth = YearMonth.now()
    val pagerState = rememberPagerState(initialPage = 50) { 100 }
    val currentMonth = initialMonth.plusMonths((pagerState.currentPage - 50).toLong())
    var recordToDelete by remember { mutableStateOf<RecordWithKeywords?>(null) }
    var recordToEdit by remember { mutableStateOf<RecordWithKeywords?>(null) }
    val listWeight = remember { Animatable(0f) }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            // Permission granted
        } else {
            // Permission denied
        }
    }

    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }


    LaunchedEffect(selectedDate) {
        if (selectedDate == null) {
            listWeight.animateTo(0f, tween(150))
        } else {
            listWeight.animateTo(0.5f, tween(150))
        }
    }

    val speechRecognizerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data: Intent? = result.data
            val results = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            if (!results.isNullOrEmpty() && selectedDate != null) {
                coroutineScope.launch {
                    val recognizedText = results[0]
                    val newRecord = Record(
                        text = recognizedText,
                        recordDate = selectedDate!!.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
                    )
                    val recordId = recordDao.insert(newRecord)

                    val keywords = keywordDao.getAllKeywords().first()
                    val matchedKeywords = keywords.filter { recognizedText.contains(it.text, ignoreCase = true) }
                    matchedKeywords.forEach {
                        recordDao.insertRecordKeywordCrossRef(RecordKeywordCrossRef(recordId.toInt(), it.text))
                    }
                    showVoicePopup = false
                }
            }
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_PROMPT, "음성 인식을 시작합니다.")
            }
            speechRecognizerLauncher.launch(intent)
        } else {
            // Handle permission denied
        }
    }

    Column(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { coroutineScope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) } }) {
                Icon(Icons.Default.KeyboardArrowLeft, contentDescription = "Previous Month")
            }
            Text(
                text = currentMonth.format(DateTimeFormatter.ofPattern("yyyy년 MM월")),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Row {
                IconButton(onClick = { showSearchDialog = true }) {
                    Icon(Icons.Default.Search, contentDescription = "Search Records")
                }
                IconButton(onClick = { showStatisticsDialog = true }) {
                    Icon(Icons.Default.BarChart, contentDescription = "View Statistics")
                }
                IconButton(onClick = { showKeywordDialog = true }) {
                    Icon(Icons.Default.Style, contentDescription = "Manage Keywords")
                }
                IconButton(onClick = { coroutineScope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) } }) {
                    Icon(Icons.Default.KeyboardArrowRight, contentDescription = "Next Month")
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            DayOfWeek.entries.forEach { dayOfWeek ->
                Text(
                    text = dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.KOREAN),
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center
                )
            }
        }

        val monthStart = currentMonth.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        val monthEnd = currentMonth.plusMonths(1).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        val recordsInMonth by recordDao.getRecordsInRangeWithKeywords(monthStart, monthEnd).collectAsState(initial = emptyList())
        val recordsByDate = remember(recordsInMonth) { recordsInMonth.groupBy { Instant.ofEpochMilli(it.record.recordDate).atZone(ZoneId.systemDefault()).toLocalDate() } }

        HorizontalPager(
            state = pagerState,
            modifier = Modifier.weight(1f - listWeight.value)
        ) { page ->
            val month = initialMonth.plusMonths((page - 50).toLong())
            CalendarMonth(month = month, selectedDate = selectedDate, recordsByDate = recordsByDate) {
                if (selectedDate == it) {
                    selectedDate = null
                } else {
                    selectedDate = it
                    if (YearMonth.from(it) == month) {
                        showVoicePopup = true
                    }
                }
            }
        }

        if (showSearchDialog) {
            SearchDialog(onDismiss = { showSearchDialog = false }, recordDao = recordDao, keywordDao = keywordDao)
        }

        if (showStatisticsDialog) {
            StatisticsDialog(onDismiss = { showStatisticsDialog = false }, recordDao = recordDao)
        }

        if (showKeywordDialog) {
            KeywordManagementDialog(
                onDismiss = { showKeywordDialog = false },
                keywordDao = keywordDao
            )
        }

        if (showVoicePopup && selectedDate != null) {
            VoiceRecordPopup(
                onDismiss = { showVoicePopup = false },
                onRecordClick = { permissionLauncher.launch(Manifest.permission.RECORD_AUDIO) },
                selectedDate = selectedDate!!
            )
        }

        recordToDelete?.let {
            DeleteConfirmationDialog(
                record = it.record,
                onConfirm = {
                    coroutineScope.launch { recordDao.delete(it.record) }
                    recordToDelete = null
                },
                onDismiss = { recordToDelete = null }
            )
        }

        recordToEdit?.let { recordWithKeywords ->
            EditRecordDialog(
                recordWithKeywords = recordWithKeywords,
                onConfirm = { updatedText ->
                    coroutineScope.launch {
                        val record = recordWithKeywords.record.copy(text = updatedText)
                        recordDao.update(record)

                        val keywords = keywordDao.getAllKeywords().first()
                        val matchedKeywords = keywords.filter { updatedText.contains(it.text, ignoreCase = true) }
                        // You might want to clear existing keywords before adding new ones
                        // For now, we just add the new ones
                        matchedKeywords.forEach {
                            recordDao.insertRecordKeywordCrossRef(RecordKeywordCrossRef(record.id, it.text))
                        }
                    }
                    recordToEdit = null
                },
                onDismiss = { recordToEdit = null }
            )
        }

        if (listWeight.value > 0f && selectedDate != null) {
            val lazyListState = rememberLazyListState()

            Column(modifier = Modifier
                .fillMaxWidth()
                .weight(listWeight.value)
                .graphicsLayer { alpha = listWeight.value / 0.5f }
                .pointerInput(Unit) {
                    detectVerticalDragGestures(
                        onDragStart = { },
                        onVerticalDrag = { change, dragAmount ->
                            val isAtTop = lazyListState.firstVisibleItemIndex == 0 && lazyListState.firstVisibleItemScrollOffset == 0
                            if (isAtTop && dragAmount > 0) {
                                coroutineScope.launch { 
                                    val newWeight = (listWeight.value - dragAmount / 1000f).coerceIn(0f, 0.5f)
                                    listWeight.snapTo(newWeight) 
                                }
                                change.consume()
                            }
                        },
                        onDragEnd = {
                            coroutineScope.launch {
                                if (listWeight.value < 0.4f) {
                                    selectedDate = null
                                } else {
                                    listWeight.animateTo(0.5f, tween(150))
                                }
                            }
                        }
                    )
                }
            ) {
                val recordsForSelectedDate = recordsByDate[selectedDate] ?: emptyList()

                Spacer(modifier = Modifier.height(16.dp))
                Text("선택된 날짜 (${DateTimeFormatter.ofPattern("yyyy년 MM월 dd일").format(selectedDate)}) 기록", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 16.dp))
                LazyColumn(
                    state = lazyListState, 
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    contentPadding = PaddingValues(vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (recordsForSelectedDate.isEmpty()) {
                        item { Text("기록이 없습니다.") }
                    } else {
                        items(recordsForSelectedDate) { recordWithKeywords ->
                            RecordItem(
                                recordWithKeywords = recordWithKeywords,
                                onEditClick = { recordToEdit = it },
                                onDeleteClick = { recordToDelete = it }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CalendarMonth(month: YearMonth, selectedDate: LocalDate?, recordsByDate: Map<LocalDate, List<RecordWithKeywords>>, onDayClick: (LocalDate) -> Unit) {
    val firstDayOfMonth = month.atDay(1)
    val firstDayOfWeekIndex = (firstDayOfMonth.dayOfWeek.value - 1 + 7) % 7
    val firstCalendarDay = firstDayOfMonth.minusDays(firstDayOfWeekIndex.toLong())
    val calendarDays = remember(month) { (0 until 42).map { firstCalendarDay.plusDays(it.toLong()) } }

    LazyVerticalGrid(
        columns = GridCells.Fixed(7),
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceEvenly,
        userScrollEnabled = false
    ) {
        items(calendarDays) { day ->
            DayCell(
                day = day,
                currentMonth = month,
                selectedDate = selectedDate,
                recordsWithKeywords = recordsByDate[day] ?: emptyList(),
                onDayClick = onDayClick
            )
        }
    }
}

@Composable
fun DayCell(day: LocalDate, currentMonth: YearMonth, selectedDate: LocalDate?, recordsWithKeywords: List<RecordWithKeywords>, onDayClick: (LocalDate) -> Unit) {
    val isCurrentMonth = YearMonth.from(day) == currentMonth
    val isToday = day == LocalDate.now()
    val isSelected = day == selectedDate

    val recordCount = recordsWithKeywords.size
    val githubLikeColor = when {
        recordCount >= 5 -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.8f)
        recordCount >= 3 -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f)
        recordCount >= 1 -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)
        else -> Color.Transparent
    }

    val boxModifier = Modifier
        .aspectRatio(1f)
        .padding(2.dp)
        .clip(RoundedCornerShape(8.dp))
        .background(
            if (isToday) MaterialTheme.colorScheme.secondaryContainer else githubLikeColor
        )
        .border(
            width = if (isSelected) 2.dp else 0.dp,
            color = if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent,
            shape = RoundedCornerShape(8.dp)
        )
        .clickable(enabled = isCurrentMonth) { onDayClick(day) }

    val textColor = when {
        !isCurrentMonth -> MaterialTheme.colorScheme.outline
        isToday -> MaterialTheme.colorScheme.onSecondaryContainer
        recordCount > 0 -> MaterialTheme.colorScheme.onPrimaryContainer
        else -> MaterialTheme.colorScheme.onSurface
    }

    Box(
        modifier = boxModifier,
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = day.dayOfMonth.toString(),
                fontSize = 14.sp,
                color = textColor,
                fontWeight = if (isToday || isSelected) FontWeight.Bold else FontWeight.Normal
            )

            val keywordsCount = recordsWithKeywords.sumOf { it.keywords.size }
            Row(
                modifier = Modifier.height(14.dp).padding(top = 2.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically
            ) {
                (0 until keywordsCount.coerceAtMost(5)).forEach { _ ->
                    Box(
                        modifier = Modifier
                            .size(4.dp)
                            .clip(CircleShape)
                            .background(textColor.copy(alpha = 0.7f))
                    )
                }
            }
        }
    }
}


@Composable
fun VoiceRecordPopup(onDismiss: () -> Unit, onRecordClick: () -> Unit, selectedDate: LocalDate) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("${DateTimeFormatter.ofPattern("yyyy년 MM월 dd일").format(selectedDate)} 기록") },
        text = { Text("음성으로 기록하시겠습니까?") },
        confirmButton = { Button(onClick = onRecordClick) { Text("음성 인식 시작") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("취소") } }
    )
}

@Composable
fun RecordItem(
    recordWithKeywords: RecordWithKeywords,
    onEditClick: (RecordWithKeywords) -> Unit,
    onDeleteClick: (RecordWithKeywords) -> Unit,
    modifier: Modifier = Modifier
) {
    val record = recordWithKeywords.record
    Card(
        modifier = modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                val formattedDate = remember(record) { LocalDateTime.ofInstant(Instant.ofEpochMilli(record.createdAt), ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("yyyy년 MM월 dd일 HH:mm:ss", Locale.getDefault())) }
                Text(text = record.text)
                if (recordWithKeywords.keywords.isNotEmpty()) {
                    Text(
                        text = recordWithKeywords.keywords.joinToString(", ") { it.text },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
                Text(text = formattedDate, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
            }
            Row {
                IconButton(onClick = { onEditClick(recordWithKeywords) }) {
                    Icon(Icons.Default.Edit, contentDescription = "Edit Record")
                }
                IconButton(onClick = { onDeleteClick(recordWithKeywords) }) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete Record")
                }
            }
        }
    }
}

@Composable
fun DeleteConfirmationDialog(record: Record, onConfirm: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("기록 삭제") },
        text = { Text("'${record.text}' 기록을 정말 삭제하시겠습니까?") },
        confirmButton = { Button(onClick = onConfirm) { Text("삭제") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("취소") } }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditRecordDialog(recordWithKeywords: RecordWithKeywords, onConfirm: (String) -> Unit, onDismiss: () -> Unit) {
    var text by remember { mutableStateOf(recordWithKeywords.record.text) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("기록 수정") },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                label = { Text("내용") },
                modifier = Modifier.fillMaxWidth()
            )
        },
        confirmButton = { Button(onClick = { onConfirm(text) }) { Text("저장") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("취소") } }
    )
}

@Composable
fun SearchDialog(onDismiss: () -> Unit, recordDao: RecordDao, keywordDao: KeywordDao) {
    val keywords by keywordDao.getAllKeywords().collectAsState(initial = emptyList())
    var selectedKeyword by remember { mutableStateOf<Keyword?>(null) }
    val records by (selectedKeyword?.let { recordDao.getRecordsByKeywordWithKeywords(it.text) } ?: flowOf(emptyList())).collectAsState(initial = emptyList())

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("키워드로 기록 검색") },
        text = {
            Column {
                Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
                    keywords.forEach { keyword ->
                        Button(
                            onClick = { selectedKeyword = keyword },
                            modifier = Modifier.padding(end = 8.dp)
                        ) {
                            Text(keyword.text)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                LazyColumn {
                    items(records) { recordWithKeywords ->
                        RecordItem(recordWithKeywords = recordWithKeywords, onEditClick = {}, onDeleteClick = {})
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("닫기") } }
    )
}

@Composable
fun StatisticsDialog(onDismiss: () -> Unit, recordDao: RecordDao) {
    val topKeywords by recordDao.getTop5Keywords().collectAsState(initial = emptyList())

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("내 마음 리포트") },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text("가장 많이 사용된 키워드 TOP 5", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                if (topKeywords.isEmpty()) {
                    Text("아직 키워드 기록이 없어요.")
                } else {
                    topKeywords.forEachIndexed { index, keywordCount ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("${index + 1}. ${keywordCount.keyword}", modifier = Modifier.weight(1f))
                            Text("${keywordCount.count}회")
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("닫기") } }
    )
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KeywordManagementDialog(onDismiss: () -> Unit, keywordDao: KeywordDao) {
    val keywords by keywordDao.getAllKeywords().collectAsState(initial = emptyList())
    var newKeywordText by remember { mutableStateOf("") }
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("키워드 관리") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = newKeywordText,
                        onValueChange = { newKeywordText = it },
                        label = { Text("새 키워드") },
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = {
                        if (newKeywordText.isNotBlank()) {
                            coroutineScope.launch {
                                val existing = keywordDao.findByText(newKeywordText)
                                if (existing == null) {
                                    keywordDao.insert(Keyword(text = newKeywordText))
                                    val workRequest = OneTimeWorkRequestBuilder<UpdateRecordsWorker>()
                                        .setInputData(workDataOf("newKeyword" to newKeywordText))
                                        .build()
                                    WorkManager.getInstance(context).enqueue(workRequest)

                                } else {
                                    keywordDao.update(existing.copy(isDeleted = false))
                                }
                                newKeywordText = ""
                            }
                        }
                    }) {
                        Icon(Icons.Default.Add, contentDescription = "Add Keyword")
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                keywords.forEach { keyword ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                    ) {
                        Text(
                            text = keyword.text,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { coroutineScope.launch { keywordDao.softDelete(keyword.id) } }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete Keyword")
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("닫기") } }
    )
}


@Preview(showBackground = true)
@Composable
fun CalendarScreenPreview() {
    HasseumTheme {
        val recordDao = object : RecordDao {
            override fun getAllRecordsWithKeywords(): Flow<List<RecordWithKeywords>> = flowOf(emptyList())
            override fun getRecordsInRangeWithKeywords(startTime: Long, endTime: Long): Flow<List<RecordWithKeywords>> = flowOf(emptyList())
            override fun getRecordsForDateWithKeywords(startOfDay: Long, endOfDay: Long): Flow<List<RecordWithKeywords>> = flowOf(emptyList())
            override fun getRecordsByKeywordWithKeywords(keyword: String): Flow<List<RecordWithKeywords>> = flowOf(emptyList())
            override fun getTop5Keywords(): Flow<List<KeywordCount>> = flowOf(emptyList())
            override suspend fun insert(record: Record): Long = 0L
            override suspend fun update(record: Record) {}
            override suspend fun delete(record: Record) {}
            override suspend fun insertRecordKeywordCrossRef(crossRef: RecordKeywordCrossRef) {}
        }
        val keywordDao = object : KeywordDao {
            override fun getAllKeywords(): Flow<List<Keyword>> = flowOf(listOf(Keyword(text = "중요")))
            override suspend fun insert(keyword: Keyword) {}
            override suspend fun update(keyword: Keyword) {}
            override suspend fun softDelete(id: Int) {}
            override suspend fun findByText(text: String): Keyword? = null
            override suspend fun delete(keyword: Keyword) {}
        }
        CalendarScreen(recordDao = recordDao, keywordDao = keywordDao)
    }
}

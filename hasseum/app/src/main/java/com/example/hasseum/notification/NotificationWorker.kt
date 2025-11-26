package com.example.hasseum.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.hasseum.R
import com.example.hasseum.database.AppDatabase
import kotlinx.coroutines.flow.first
import java.time.LocalDate
import java.time.ZoneOffset

class NotificationWorker(appContext: Context, workerParams: WorkerParameters) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val recordDao = AppDatabase.getDatabase(applicationContext).recordDao()

        val today = LocalDate.now()
        val startOfDay = today.atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli()
        val endOfDay = today.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli()

        val recordsToday = recordDao.getRecordsForDateWithKeywords(startOfDay, endOfDay).first()
        
        if (recordsToday.isEmpty()) {
            sendNotification()
        }

        return Result.success()
    }

    private fun sendNotification() {
        val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "record_reminder",
                "기록 알림",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            notificationManager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(applicationContext, "record_reminder")
            .setContentTitle("오늘 하루는 어땠나요?")
            .setContentText("오늘의 감정과 생각을 기록해보세요.")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .build()

        notificationManager.notify(1, notification)
    }
}
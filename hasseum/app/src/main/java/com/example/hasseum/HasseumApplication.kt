package com.example.hasseum

import android.app.Application
import androidx.work.*
import com.example.hasseum.notification.NotificationWorker
import java.util.concurrent.TimeUnit
import java.util.Calendar

class HasseumApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        setupNotificationWorker()
    }

    private fun setupNotificationWorker() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.NOT_REQUIRED)
            .build()

        val workRequest = PeriodicWorkRequestBuilder<NotificationWorker>(
            1, TimeUnit.DAYS
        )
        .setConstraints(constraints)
        .setInitialDelay(getInitialDelay(), TimeUnit.MILLISECONDS)
        .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "record_reminder_work",
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    private fun getInitialDelay(): Long {
        val currentTime = Calendar.getInstance()
        val dueTime = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 21)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
        }

        if (dueTime.before(currentTime)) {
            dueTime.add(Calendar.DAY_OF_YEAR, 1)
        }

        return dueTime.timeInMillis - currentTime.timeInMillis
    }
}
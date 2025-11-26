package com.example.hasseum.notification

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.hasseum.database.AppDatabase
import com.example.hasseum.database.RecordKeywordCrossRef
import kotlinx.coroutines.flow.first

class UpdateRecordsWorker(appContext: Context, workerParams: WorkerParameters) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val newKeyword = inputData.getString("newKeyword") ?: return Result.failure()
        val recordDao = AppDatabase.getDatabase(applicationContext).recordDao()

        val allRecordsWithKeywords = recordDao.getAllRecordsWithKeywords().first()

        allRecordsWithKeywords.forEach { recordWithKeywords ->
            val record = recordWithKeywords.record
            val alreadyHasKeyword = recordWithKeywords.keywords.any { it.text.equals(newKeyword, ignoreCase = true) }

            if (record.text.contains(newKeyword, ignoreCase = true) && !alreadyHasKeyword) {
                recordDao.insertRecordKeywordCrossRef(
                    RecordKeywordCrossRef(recordId = record.id, keywordText = newKeyword)
                )
            }
        }
        return Result.success()
    }
}
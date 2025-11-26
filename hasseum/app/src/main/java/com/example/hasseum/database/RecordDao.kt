package com.example.hasseum.database

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface RecordDao {

    @Insert
    suspend fun insert(record: Record): Long

    @Update
    suspend fun update(record: Record)

    @Delete
    suspend fun delete(record: Record)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecordKeywordCrossRef(crossRef: RecordKeywordCrossRef)

    @Transaction
    @Query("SELECT * FROM records ORDER BY createdAt DESC")
    fun getAllRecordsWithKeywords(): Flow<List<RecordWithKeywords>>

    @Transaction
    @Query("SELECT * FROM records WHERE recordDate >= :startOfDay AND recordDate < :endOfDay ORDER BY recordDate DESC")
    fun getRecordsForDateWithKeywords(startOfDay: Long, endOfDay: Long): Flow<List<RecordWithKeywords>>

    @Transaction
    @Query("SELECT * FROM records WHERE id IN (SELECT recordId FROM RecordKeywordCrossRef WHERE keywordText = :keyword) ORDER BY recordDate DESC")
    fun getRecordsByKeywordWithKeywords(keyword: String): Flow<List<RecordWithKeywords>>

    @Query("SELECT keywordText as keyword, COUNT(*) as count FROM RecordKeywordCrossRef GROUP BY keywordText ORDER BY count DESC LIMIT 5")
    fun getTop5Keywords(): Flow<List<KeywordCount>>

    @Transaction
    @Query("SELECT * FROM records WHERE recordDate >= :startTime AND recordDate < :endTime")
    fun getRecordsInRangeWithKeywords(startTime: Long, endTime: Long): Flow<List<RecordWithKeywords>>
}

data class KeywordCount(val keyword: String, val count: Int)

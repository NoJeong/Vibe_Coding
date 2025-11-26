package com.example.hasseum.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "records")
data class Record(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val text: String,
    val recordDate: Long = System.currentTimeMillis(),
    val createdAt: Long = System.currentTimeMillis()
)

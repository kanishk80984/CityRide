package com.driver

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DriverLocationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        DriverLocationService.reactContext = reactContext
    }

    override fun getName(): String = "DriverLocationModule"

    @ReactMethod
    fun startService(promise: Promise) {
        try {
            val intent = Intent(reactContext, DriverLocationService::class.java).apply {
                action = DriverLocationService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(reactContext, intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_SERVICE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val intent = Intent(reactContext, DriverLocationService::class.java).apply {
                action = DriverLocationService.ACTION_STOP
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_SERVICE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(DriverLocationService.isRunning)
    }

    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            val isIgnoring = powerManager.isIgnoringBatteryOptimizations(reactContext.packageName)
            promise.resolve(isIgnoring)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(reactContext))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Keep React Native NativeEventEmitter happy
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep React Native NativeEventEmitter happy
    }
}

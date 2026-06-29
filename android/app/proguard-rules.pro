# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Preserva linhas para stack traces legiveis em crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# --- Capacitor ---
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
}
-keep class br.com.simplix.gamma.** { *; }

# --- Plugins Capacitor instalados ---
-keep class com.capacitorjs.plugins.** { *; }

# --- WebView com JS bridge ---
-keep class * extends android.webkit.WebViewClient
-keep class * extends android.webkit.WebChromeClient
-keepclassmembers class * {
    @android.webkit.JavascriptInterface *;
}
-dontwarn android.webkit.**

# --- AndroidX Webkit (usado pelo Capacitor) ---
-keep class androidx.webkit.** { *; }

# --- Cordova plugins legacy (caso algum plugin Cordova esteja presente) ---
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# --- Reflexao usada por plugins ---
-keepattributes *Annotation*, Signature, Exceptions, InnerClasses, EnclosingMethod

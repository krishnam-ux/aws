$source = @"
using System;
using System.IO;
using System.Text;
using System.Reflection;
using System.Collections.Generic;
using System.Linq;

public class SebDiagnostic
{
    public static void Run(string appDir, string sebFile)
    {
        Console.WriteLine("================================================================");
        Console.WriteLine("SEB 3.10.2 CONFIGURATION SCHEMA & RUNTIME DIAGNOSTIC TOOL");
        Console.WriteLine("================================================================");
        var asmLoggingContracts = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Logging.Contracts.dll");
        var asmLogging = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Logging.dll");
        var asmConfigContracts = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Configuration.Contracts.dll");
        var asmConfig = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Configuration.dll");
        var asmSettings = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Settings.dll");
        var asmCore = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Core.dll");

        var loggerType = asmLogging.GetType("SafeExamBrowser.Logging.Logger");
        var modLoggerType = asmLogging.GetType("SafeExamBrowser.Logging.ModuleLogger");
        var certStoreType = asmConfig.GetType("SafeExamBrowser.Configuration.Cryptography.CertificateStore");
        var repoType = asmConfig.GetType("SafeExamBrowser.Configuration.ConfigurationRepository");
        var fileLoaderType = asmConfig.GetType("SafeExamBrowser.Configuration.DataResources.FileResourceLoader");
        var compressorType = asmConfig.GetType("SafeExamBrowser.Configuration.DataCompression.GZipCompressor");
        var xmlParserType = asmConfig.GetType("SafeExamBrowser.Configuration.DataFormats.XmlParser");
        var xmlSerializerType = asmConfig.GetType("SafeExamBrowser.Configuration.DataFormats.XmlSerializer");
        var appSettingsType = asmSettings.GetType("SafeExamBrowser.Settings.AppSettings");

        var logger = Activator.CreateInstance(loggerType);
        var modLogger = Activator.CreateInstance(modLoggerType, new object[] { logger, "Diagnostic" });
        var certStore = Activator.CreateInstance(certStoreType, new object[] { logger });
        var repo = Activator.CreateInstance(repoType, new object[] { certStore, modLogger });

        var fileLoader = Activator.CreateInstance(fileLoaderType, new object[] { logger });
        var compressor = Activator.CreateInstance(compressorType, new object[] { logger });
        var xmlParser = Activator.CreateInstance(xmlParserType, new object[] { compressor, logger });

        // Register
        var regMethod = repoType.GetMethods().First(m => m.Name == "Register" && m.GetParameters()[0].ParameterType.Name == "IResourceLoader");
        regMethod.Invoke(repo, new object[] { fileLoader });
        var regParserMethod = repoType.GetMethods().First(m => m.Name == "Register" && m.GetParameters()[0].ParameterType.Name == "IDataParser");
        regParserMethod.Invoke(repo, new object[] { xmlParser });

        // 1. Load default settings
        var loadDefMethod = repoType.GetMethod("LoadDefaultSettings");
        var defaultSettings = loadDefMethod.Invoke(repo, null);
        Console.WriteLine("[PASS 1] Default SEB AppSettings loaded successfully.");

        // 2. Parse SEB file
        var uri = new Uri("file:///" + Path.GetFullPath(sebFile).Replace('\\', '/'));
        var tryLoadMethod = repoType.GetMethod("TryLoadSettings");
        object[] args = new object[] { uri, null, null };
        var status = tryLoadMethod.Invoke(repo, args);
        object loadedSettings = args[1];

        Console.WriteLine("[PASS 2] TryLoadSettings status for " + Path.GetFileName(sebFile) + ": " + status);
        if (loadedSettings == null)
        {
            Console.WriteLine("[FAIL] loadedSettings is null!");
            return;
        }

        // 3. Inspect RawData vs Supported Keys in SEB
        var parseResult = xmlParserType.GetMethod("TryParse").Invoke(xmlParser, new object[] { File.OpenRead(sebFile), null });
        var rawData = (IDictionary<string, object>)parseResult.GetType().GetProperty("RawData").GetValue(parseResult);

        Console.WriteLine("\n--- RAW CONFIGURATION KEYS VALIDATION (" + rawData.Count + " keys) ---");

        var keysRoot = asmConfig.GetType("SafeExamBrowser.Configuration.ConfigurationData.Keys");
        var allSebKeys = new HashSet<string>();
        CollectKeys(keysRoot, allSebKeys);

        Console.WriteLine("SEB 3.10.2 recognized keys count: " + allSebKeys.Count);

        int unknownKeys = 0;
        foreach (var key in rawData.Keys)
        {
            bool known = allSebKeys.Contains(key);
            if (!known)
            {
                Console.WriteLine("[UNKNOWN KEY IN SEB SCHEMA] " + key);
                unknownKeys++;
            }
            else
            {
                Console.WriteLine("[VALID SEB KEY] " + key + " (Value: " + FormatVal(rawData[key]) + ")");
            }
        }
        Console.WriteLine("Total unknown/unsupported keys in XML: " + unknownKeys);

        // 4. Compare with default/minimal config
        Console.WriteLine("\n--- SETTINGS DIFFERENCE FROM DEFAULT ---");
        CompareObjects(defaultSettings, loadedSettings, "AppSettings");
    }

    private static string FormatVal(object v)
    {
        if (v == null) return "null";
        if (v is byte[] b) return "bytes[" + b.Length + "]";
        if (v is System.Collections.IList l) return "array[" + l.Count + "]";
        return v.ToString();
    }

    private static void CollectKeys(Type t, HashSet<string> keys)
    {
        var flags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static;
        foreach (var f in t.GetFields(flags))
        {
            var val = f.GetValue(null);
            if (val is string s) keys.Add(s);
        }
        foreach (var n in t.GetNestedTypes(flags))
        {
            CollectKeys(n, keys);
        }
    }

    private static void CompareObjects(object def, object cur, string prefix)
    {
        if (def == null && cur == null) return;
        if (def == null || cur == null)
        {
            Console.WriteLine(prefix + ": def=" + (def ?? "null") + " != cur=" + (cur ?? "null"));
            return;
        }

        var props = def.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance);
        foreach (var p in props)
        {
            var defVal = p.GetValue(def);
            var curVal = p.GetValue(cur);

            if (p.PropertyType.IsPrimitive || p.PropertyType.IsEnum || p.PropertyType == typeof(string) || p.PropertyType == typeof(DateTime))
            {
                if (!object.Equals(defVal, curVal))
                {
                    Console.WriteLine(prefix + "." + p.Name + " changed: DEFAULT='" + defVal + "' -> CONFIGURED='" + curVal + "'");
                }
            }
            else if (defVal is System.Collections.ICollection colDef && curVal is System.Collections.ICollection colCur)
            {
                if (colDef.Count != colCur.Count)
                {
                    Console.WriteLine(prefix + "." + p.Name + " Count changed: DEFAULT=" + colDef.Count + " -> CONFIGURED=" + colCur.Count);
                }
            }
            else
            {
                CompareObjects(defVal, curVal, prefix + "." + p.Name);
            }
        }
    }
}
"@

Add-Type -TypeDefinition $source
[SebDiagnostic]::Run("C:\Program Files\SafeExamBrowser\Application", "C:\Users\krish\aws\fresh_certification_exam.seb")
